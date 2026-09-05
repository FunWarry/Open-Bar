package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.EncaissementRequestDTO;
import com.bar.gestioncocktail.dto.FactureResponseDTO;
import com.bar.gestioncocktail.listener.StompBroadcastEventListener;
import com.bar.gestioncocktail.listener.TableEventListener;
import com.bar.gestioncocktail.model.Cocktail;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.CocktailRepository;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.service.CommandeService;
import com.bar.gestioncocktail.service.FactureService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Full-stack integration test verifying that Spring Boot context starts up cleanly
 * with circular references strictly disabled (spring.main.allow-circular-references=false)
 * and domain events properly orchestrate table and order lifecycle transitions.
 */
@Transactional
class CircularReferenceAndDomainEventsIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private Environment environment;

    @Autowired
    private TableRepository tableRepository;

    @Autowired
    private CommandeRepository commandeRepository;

    @Autowired
    private CocktailRepository cocktailRepository;

    @Autowired
    private CommandeService commandeService;

    @Autowired
    private FactureService factureService;

    private TableEntity testTable;

    @BeforeEach
    void setUpTestData() {
        testTable = new TableEntity();
        testTable.setNumero(999);
        testTable.setCapacite(4);
        testTable.setZone("VIP_LOUNGE");
        testTable.setOccupee(false);
        testTable = tableRepository.save(testTable);

        Cocktail testCocktail = new Cocktail();
        testCocktail.setNom("Event Mule");
        testCocktail.setPrix(new BigDecimal("14.00"));
        testCocktail.setCategorie(CocktailCategorie.ALCOOLISE);
        cocktailRepository.save(testCocktail);
    }

    @Test
    @DisplayName("Context startup - strictly forbids circular references and loads all listeners")
    void contextLoads_withCircularReferencesDisabled() {
        String allowCircular = environment.getProperty("spring.main.allow-circular-references");
        assertThat(allowCircular).isEqualTo("false");

        assertThat(applicationContext.getBean(StompBroadcastEventListener.class)).isNotNull();
        assertThat(applicationContext.getBean(TableEventListener.class)).isNotNull();
        assertThat(applicationContext.getBean(CommandeService.class)).isNotNull();
        assertThat(applicationContext.getBean(FactureService.class)).isNotNull();
    }

    @Test
    @DisplayName("Domain Event flow - order creation synchronizes table occupancy via TableEventListener")
    void orderCreatedEvent_synchronizesTableOccupancy() {
        Commande commande = new Commande();
        commande.setTable(testTable);
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setTotal(new BigDecimal("14.00"));

        Commande created = commandeService.createCommande(commande);
        assertThat(created).isNotNull();

        TableEntity refreshedTable = tableRepository.findById(testTable.getId()).orElseThrow();
        assertThat(refreshedTable.isOccupee()).isTrue();
        assertThat(refreshedTable.getDateOccupation()).isNotNull();
    }

    @Test
    @DisplayName("Domain Event flow - invoice settlement liberates table and marks orders settled")
    void invoiceSettledEvent_liberatesTableAndSettlesOrders() {
        Commande commande = new Commande();
        commande.setTable(testTable);
        commande.setStatut(CommandeStatut.EN_ATTENTE);
        commande.setTotal(new BigDecimal("28.00"));
        commande = commandeService.createCommande(commande);

        EncaissementRequestDTO request = new EncaissementRequestDTO(
                "CARTE",
                null,
                null,
                null,
                null,
                "Settled via integration test",
                true,
                List.of(commande.getId())
        );

        FactureResponseDTO response = factureService.encaisserTable(testTable.getId(), request);

        assertThat(response).isNotNull();
        assertThat(response.reglee()).isTrue();

        TableEntity refreshedTable = tableRepository.findById(testTable.getId()).orElseThrow();
        assertThat(refreshedTable.isOccupee()).isFalse();
        assertThat(refreshedTable.getDateLiberation()).isNotNull();

        Commande refreshedOrder = commandeRepository.findById(commande.getId()).orElseThrow();
        assertThat(refreshedOrder.getStatut()).isEqualTo(CommandeStatut.REGLEE);
        assertThat(refreshedOrder.getDateReglement()).isNotNull();
    }
}
