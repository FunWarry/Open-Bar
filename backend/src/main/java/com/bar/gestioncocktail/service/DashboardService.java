package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.DashboardStatsDTO;
import com.bar.gestioncocktail.dto.TopCocktailDTO;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Service calculating real-time dashboard statistics and operational KPIs for managers.
 */
@Service
public class DashboardService {

    private static final Logger log = LoggerFactory.getLogger(DashboardService.class);
    private static final int TOP_COCKTAILS_LIMIT = 5;

    private final CommandeRepository commandeRepository;
    private final TableRepository tableRepository;
    private final IngredientRepository ingredientRepository;
    private final TimeService timeService;

    /**
     * Constructor injecting required repositories and time service.
     *
     * @param commandeRepository Orders repository
     * @param tableRepository Tables repository
     * @param ingredientRepository Ingredients repository
     * @param timeService System time provider
     */
    public DashboardService(
        CommandeRepository commandeRepository,
        TableRepository tableRepository,
        IngredientRepository ingredientRepository,
        TimeService timeService
    ) {
        this.commandeRepository = commandeRepository;
        this.tableRepository = tableRepository;
        this.ingredientRepository = ingredientRepository;
        this.timeService = timeService;
    }

    /**
     * Aggregates and returns the full operational and financial statistics for today.
     *
     * @return DashboardStatsDTO containing revenues, counts, and top cocktail rankings
     */
    @Transactional(readOnly = true)
    public DashboardStatsDTO getStats() {
        LocalDateTime debutJour = timeService.today().atStartOfDay();
        LocalDateTime debutMois = timeService.today().withDayOfMonth(1).atStartOfDay();


        long enAttente = commandeRepository.countByStatut(CommandeStatut.EN_ATTENTE);
        long enPreparation = commandeRepository.countByStatut(CommandeStatut.EN_PREPARATION);
        long pret = commandeRepository.countByStatut(CommandeStatut.PRET);
        long livrees = commandeRepository.countByStatut(CommandeStatut.LIVREE);
        long total = commandeRepository.count();

        BigDecimal caJour = getChiffreAffairesDepuis(debutJour);
        BigDecimal caMois = getChiffreAffairesDepuis(debutMois);

        long tablesOccupees = tableRepository.countByOccupeeTrue();
        long tablesTotales = tableRepository.count();

        List<TopCocktailDTO> topCocktails = commandeRepository
            .findTopCocktails(PageRequest.of(0, TOP_COCKTAILS_LIMIT));

        long stockCritique = ingredientRepository.countIngredientsSousSeuil();

        return new DashboardStatsDTO(
            total, enAttente, enPreparation, pret, livrees,
            caJour, caMois,
            tablesOccupees, tablesTotales,
            topCocktails,
            stockCritique
        );
    }

    private BigDecimal getChiffreAffairesDepuis(LocalDateTime depuis) {
        try {
            BigDecimal ca = commandeRepository.sumTotalByStatutAndDateCommandeAfter(
                CommandeStatut.REGLEE, depuis
            );
            return ca != null ? ca : BigDecimal.ZERO;
        } catch (Exception e) {
            log.warn("Error calculating revenue since {}: {}", depuis, e.getMessage());
            return BigDecimal.ZERO;
        }
    }
}
