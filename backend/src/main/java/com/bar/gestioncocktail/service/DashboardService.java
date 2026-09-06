package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.DashboardMarginAnalyticsDTO;
import com.bar.gestioncocktail.dto.DashboardStatsDTO;
import com.bar.gestioncocktail.dto.ProfitableCocktailDTO;
import com.bar.gestioncocktail.dto.TopCocktailDTO;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Service calculating real-time dashboard statistics, COGS, gross margins, and operational KPIs for managers.
 */
@Service
public class DashboardService {

    private static final Logger log = LoggerFactory.getLogger(DashboardService.class);
    private static final int TOP_COCKTAILS_LIMIT = 5;

    private final CommandeRepository commandeRepository;
    private final TableRepository tableRepository;
    private final IngredientRepository ingredientRepository;
    private final TimeService timeService;
    private final MarginCalculationService marginCalculationService;

    /**
     * Constructor injecting required repositories, time service, and margin calculation service.
     *
     * @param commandeRepository       Orders repository
     * @param tableRepository          Tables repository
     * @param ingredientRepository     Ingredients repository
     * @param timeService              System time provider
     * @param marginCalculationService Service calculating recipe costs, COGS, and profit margins
     */
    @Autowired
    public DashboardService(
        CommandeRepository commandeRepository,
        TableRepository tableRepository,
        IngredientRepository ingredientRepository,
        TimeService timeService,
        MarginCalculationService marginCalculationService
    ) {
        this.commandeRepository = commandeRepository;
        this.tableRepository = tableRepository;
        this.ingredientRepository = ingredientRepository;
        this.timeService = timeService;
        this.marginCalculationService = marginCalculationService;
    }

    /**
     * Backward-compatible constructor without margin calculation service.
     *
     * @param commandeRepository   Orders repository
     * @param tableRepository      Tables repository
     * @param ingredientRepository Ingredients repository
     * @param timeService          System time provider
     */
    public DashboardService(
        CommandeRepository commandeRepository,
        TableRepository tableRepository,
        IngredientRepository ingredientRepository,
        TimeService timeService
    ) {
        this(commandeRepository, tableRepository, ingredientRepository, timeService, null);
    }

    /**
     * Aggregates and returns the full operational and financial statistics for today including COGS and gross margins.
     *
     * @return DashboardStatsDTO containing revenues, counts, top cocktails, and financial health metrics
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

        DashboardMarginAnalyticsDTO marginAnalytics = marginCalculationService != null
            ? marginCalculationService.getDashboardMarginAnalytics()
            : null;

        BigDecimal totalCogsJour = marginAnalytics != null ? marginAnalytics.totalCogsJour() : BigDecimal.ZERO;
        BigDecimal margeBruteJour = marginAnalytics != null ? marginAnalytics.margeBruteJour() : BigDecimal.ZERO;
        BigDecimal tauxMargeBruteJour = marginAnalytics != null ? marginAnalytics.tauxMargeBruteJour() : BigDecimal.ZERO;
        List<ProfitableCocktailDTO> mostProfitableCocktails = marginAnalytics != null
            ? marginAnalytics.mostProfitableCocktails()
            : Collections.emptyList();

        return new DashboardStatsDTO(
            total, enAttente, enPreparation, pret, livrees,
            caJour, caMois,
            tablesOccupees, tablesTotales,
            topCocktails,
            stockCritique,
            totalCogsJour,
            margeBruteJour,
            tauxMargeBruteJour,
            mostProfitableCocktails
        );
    }

    /**
     * Retrieves standalone financial health, COGS, and gross margin analytics for the manager dashboard.
     *
     * @return DashboardMarginAnalyticsDTO containing total revenues, COGS, gross margins, and top profitable drinks
     */
    @Transactional(readOnly = true)
    public DashboardMarginAnalyticsDTO getMarginAnalytics() {
        if (marginCalculationService != null) {
            return marginCalculationService.getDashboardMarginAnalytics();
        }
        return new DashboardMarginAnalyticsDTO(
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, Collections.emptyList()
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
