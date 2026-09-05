package com.bar.gestioncocktail.listener;

import com.bar.gestioncocktail.event.InvoiceSettledEvent;
import com.bar.gestioncocktail.event.OrderCreatedEvent;
import com.bar.gestioncocktail.event.TableLiberatedEvent;
import com.bar.gestioncocktail.event.TableUpdatedEvent;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.service.TimeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TableEventListenerTest {

    @Mock
    private TableRepository tableRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Spy
    private TimeService timeService = new TimeService(null);

    @InjectMocks
    private TableEventListener listener;

    private TableEntity table;
    private Commande commande;
    private User server;

    @BeforeEach
    void setUp() {
        table = new TableEntity();
        table.setId(10L);
        table.setNumero(5);
        table.setOccupee(false);

        server = new User();
        server.setId(3L);
        server.setNom("Alice");

        commande = new Commande();
        commande.setId(100L);
        commande.setTable(table);
        commande.setServeur(server);

        lenient().when(tableRepository.save(any(TableEntity.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("onOrderCreated - marks table occupied and publishes TableUpdatedEvent")
    void onOrderCreated_marksTableOccupied() {
        when(tableRepository.findById(10L)).thenReturn(Optional.of(table));

        listener.onOrderCreated(new OrderCreatedEvent(commande));

        assertThat(table.isOccupee()).isTrue();
        assertThat(table.getServeurId()).isEqualTo(3L);
        assertThat(table.getDateOccupation()).isNotNull();
        verify(tableRepository).save(table);
        verify(eventPublisher).publishEvent(any(TableUpdatedEvent.class));
    }

    @Test
    @DisplayName("onOrderCreated - does not overwrite if table is already occupied")
    void onOrderCreated_alreadyOccupied_doesNotOverwrite() {
        table.setOccupee(true);
        table.setServeurId(9L);
        LocalDateTime originalOccupation = LocalDateTime.of(2026, 9, 5, 12, 0);
        table.setDateOccupation(originalOccupation);
        when(tableRepository.findById(10L)).thenReturn(Optional.of(table));

        listener.onOrderCreated(new OrderCreatedEvent(commande));

        assertThat(table.getServeurId()).isEqualTo(9L);
        assertThat(table.getDateOccupation()).isEqualTo(originalOccupation);
        verify(tableRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("onOrderCreated - handles null event, null order, or null table gracefully")
    void onOrderCreated_nullSafe() {
        listener.onOrderCreated(null);
        listener.onOrderCreated(new OrderCreatedEvent(null));

        Commande cmdWithoutTable = new Commande();
        listener.onOrderCreated(new OrderCreatedEvent(cmdWithoutTable));

        verifyNoInteractions(tableRepository);
        verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("onInvoiceSettled - liberates table and publishes TableLiberatedEvent when requested")
    void onInvoiceSettled_liberatesTable() {
        table.setOccupee(true);
        table.setServeurId(3L);
        table.setDateOccupation(LocalDateTime.now());
        when(tableRepository.findById(10L)).thenReturn(Optional.of(table));

        Facture facture = new Facture();
        facture.setId(1L);
        InvoiceSettledEvent event = new InvoiceSettledEvent(facture, table, List.of(commande), true);

        listener.onInvoiceSettled(event);

        assertThat(table.isOccupee()).isFalse();
        assertThat(table.getServeurId()).isNull();
        assertThat(table.getDateOccupation()).isNull();
        assertThat(table.getDateLiberation()).isNotNull();
        verify(tableRepository).save(table);
        verify(eventPublisher).publishEvent(any(TableLiberatedEvent.class));
    }

    @Test
    @DisplayName("onInvoiceSettled - does not liberate table when tableLiberated is false")
    void onInvoiceSettled_notLiberated_skipsLiberation() {
        table.setOccupee(true);
        Facture facture = new Facture();
        facture.setId(1L);
        InvoiceSettledEvent event = new InvoiceSettledEvent(facture, table, List.of(commande), false);

        listener.onInvoiceSettled(event);

        assertThat(table.isOccupee()).isTrue();
        verify(tableRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("onInvoiceSettled - handles null event or null table safely")
    void onInvoiceSettled_nullSafe() {
        listener.onInvoiceSettled(null);
        listener.onInvoiceSettled(new InvoiceSettledEvent(null, null, List.of(), true));

        verifyNoInteractions(tableRepository);
        verifyNoInteractions(eventPublisher);
    }
}
