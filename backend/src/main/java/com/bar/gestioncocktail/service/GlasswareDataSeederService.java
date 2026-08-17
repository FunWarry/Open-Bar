package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Glassware;
import com.bar.gestioncocktail.repository.GlasswareRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Automatically populates the bar's standard glassware catalog on application startup
 * if the table is empty.
 */
@Service
public class GlasswareDataSeederService {

    private static final Logger log = LoggerFactory.getLogger(GlasswareDataSeederService.class);

    private final GlasswareRepository glasswareRepository;
    private final TimeService timeService;

    /**
     * Constructor injection.
     *
     * @param glasswareRepository Glassware repository
     * @param timeService Current time provider
     */
    public GlasswareDataSeederService(GlasswareRepository glasswareRepository, TimeService timeService) {
        this.glasswareRepository = glasswareRepository;
        this.timeService = timeService;
    }

    /**
     * Seeds predefined standard glassware catalog on startup if no items exist.
     */
    @PostConstruct
    @Transactional
    public void seedGlasswareIfEmpty() {
        if (glasswareRepository.count() > 0) {
            log.info("Glassware catalog already populated, skipping seeder.");
            return;
        }

        log.info("Populating predefined glassware catalog...");
        LocalDateTime now = timeService.now();

        List<Glassware> predefinedList = List.of(
            createGlassware("Verre Tumbler / Highball", "35.0", "assets/images/verres/verre_tumbler.png", "Idéal pour les Long Drinks, Mojitos, Cuba Libre et sodas", true, now),
            createGlassware("Verre Old Fashioned / Rocks", "30.0", "assets/images/verres/verre_old_fashioned.png", "Verre bas pour cocktails courts servis on the rocks (Negroni, Old Fashioned)", true, now),
            createGlassware("Coupe à Cocktail / Martini", "18.0", "assets/images/verres/verre_martini.png", "Pour cocktails servis sans glace, straight up (Cosmopolitan, Manhattan)", true, now),
            createGlassware("Verre Margarita", "25.0", "assets/images/verres/verre_margarita.png", "Coupette évasée idéale pour Margarita avec bord givré", true, now),
            createGlassware("Verre Ballon / Copa", "45.0", "assets/images/verres/verre_ballon.png", "Grand verre rond pour Gin Tonic et créations aromatiques fraîches", true, now),
            createGlassware("Flûte à Champagne", "16.0", "assets/images/verres/verre_flute.png", "Verre haut et fin pour cocktails effervescents et pétillants (Bellini, Mimosa)", true, now),
            createGlassware("Tasse en cuivre", "40.0", "assets/images/verres/tasse_cuivre.png", "Mug métallique traditionnel conservant la fraîcheur pour Moscow Mule", true, now),
            createGlassware("Verre Tiki", "40.0", "assets/images/verres/verre_tiki.png", "Verre exotique sculpté pour cocktails tropicaux et punchs aux fruits", true, now),
            createGlassware("Verre à Shot / Chupito", "5.0", "assets/images/verres/verre_tumbler.png", "Petit verre pour shooters et dégustations pures", true, now)
        );

        glasswareRepository.saveAll(predefinedList);
        log.info("Successfully seeded {} standard glassware items.", predefinedList.size());
    }

    private Glassware createGlassware(String nom, String contenanceCl, String imageUrl, String description, boolean isPredefined, LocalDateTime now) {
        Glassware g = new Glassware();
        g.setNom(nom);
        g.setContenanceCl(new BigDecimal(contenanceCl));
        g.setImageUrl(imageUrl);
        g.setDescription(description);
        g.setPredefined(isPredefined);
        g.setCreatedAt(now);
        g.setUpdatedAt(now);
        return g;
    }
}
