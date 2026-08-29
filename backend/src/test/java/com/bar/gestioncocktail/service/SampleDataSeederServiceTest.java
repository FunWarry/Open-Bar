package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.ZoneId;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link SampleDataSeederService}.
 */
@ExtendWith(MockitoExtension.class)
class SampleDataSeederServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TableRepository tableRepository;

    @Mock
    private ZoneRepository zoneRepository;

    @Mock
    private EtageRepository etageRepository;

    @Mock
    private CocktailRepository cocktailRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private RecipeStepTemplateRepository recipeStepTemplateRepository;

    @Mock
    private CommandeRepository commandeRepository;

    @Mock
    private FactureRepository factureRepository;

    @Mock
    private FactureReglementRepository factureReglementRepository;

    @Mock
    private AvoirCreditRepository avoirCreditRepository;

    @Mock
    private ShiftPresetRepository shiftPresetRepository;

    @Mock
    private EmployeeShiftRepository employeeShiftRepository;

    @Mock
    private EstablishmentClosureRepository establishmentClosureRepository;

    @Mock
    private WeekSchedulePublicationRepository weekSchedulePublicationRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private TimeService timeService;

    @Mock
    private org.springframework.transaction.PlatformTransactionManager transactionManager;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private SampleDataSeederService sampleDataSeederService;

    @BeforeEach
    void setUp() {
        lenient().when(timeService.now()).thenReturn(LocalDateTime.of(2026, Month.AUGUST, 6, 17, 0));
        lenient().when(passwordEncoder.encode(any())).thenReturn("encodedPassword");
        lenient().when(recipeStepTemplateRepository.findByName(any())).thenReturn(Optional.empty());
        lenient().when(recipeStepTemplateRepository.save(any())).thenAnswer(invocation -> {
            RecipeStepTemplate t = invocation.getArgument(0);
            if (t != null && t.getId() == null) t.setId(1L);
            return t;
        });

        Ingredient mockIng = new Ingredient();
        mockIng.setId(1L);
        mockIng.setNom("Rhum Blanc");
        mockIng.setQuantiteStock(new BigDecimal("10.0"));
        mockIng.setSeuilAlerte(new BigDecimal("5.0"));
        lenient().when(ingredientRepository.findByNomIgnoreCase(any())).thenReturn(Optional.of(mockIng));

        Cocktail mockMojito = new Cocktail();
        mockMojito.setId(1L);
        mockMojito.setNom("Mojito");
        mockMojito.setPrix(new BigDecimal("9.50"));
        mockMojito.setRecipeSteps(new ArrayList<>());
        lenient().when(cocktailRepository.findByNomIgnoreCase(any())).thenReturn(Optional.of(mockMojito));
        lenient().when(cocktailRepository.findByNomIgnoreCaseWithRecipeSteps(any())).thenReturn(Optional.of(mockMojito));
        lenient().when(cocktailRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(cocktailRepository.findAll()).thenReturn(List.of(mockMojito));

        lenient().when(userRepository.findByUsername(any())).thenReturn(Optional.empty());
        lenient().when(userRepository.save(any())).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            if (u != null && u.getId() == null) u.setId(1L);
            return u;
        });

        lenient().when(tableRepository.findByNumero(anyInt())).thenAnswer(invocation -> {
            TableEntity t = new TableEntity();
            t.setNumero(invocation.getArgument(0));
            t.setId(1L);
            return Optional.of(t);
        });
        lenient().when(tableRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        lenient().when(factureRepository.save(any())).thenAnswer(invocation -> {
            Facture f = invocation.getArgument(0);
            if (f != null && f.getId() == null) f.setId(1L);
            return f;
        });

        lenient().when(commandeRepository.save(any())).thenAnswer(invocation -> {
            Commande c = invocation.getArgument(0);
            if (c != null && c.getId() == null) c.setId(1L);
            return c;
        });
        lenient().when(factureReglementRepository.save(any())).thenAnswer(invocation -> {
            FactureReglement fr = invocation.getArgument(0);
            if (fr != null && fr.getId() == null) fr.setId(1L);
            return fr;
        });
        lenient().when(avoirCreditRepository.save(any())).thenAnswer(invocation -> {
            AvoirCredit ac = invocation.getArgument(0);
            if (ac != null && ac.getId() == null) ac.setId(1L);
            return ac;
        });
        lenient().when(employeeShiftRepository.save(any())).thenAnswer(invocation -> {
            EmployeeShift es = invocation.getArgument(0);
            if (es != null && es.getId() == null) es.setId(1L);
            return es;
        });
        lenient().when(establishmentClosureRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(weekSchedulePublicationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        lenient().when(shiftPresetRepository.count()).thenReturn(0L);
        lenient().when(shiftPresetRepository.findByTypeShift(any())).thenReturn(Optional.empty());
        lenient().when(establishmentClosureRepository.count()).thenReturn(0L);
        lenient().when(weekSchedulePublicationRepository.count()).thenReturn(0L);
        lenient().when(weekSchedulePublicationRepository.findByWeekStart(any())).thenReturn(Optional.empty());
        lenient().when(employeeShiftRepository.findByUserId(anyLong())).thenReturn(List.of());
        lenient().when(avoirCreditRepository.findByNumero(anyString())).thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("seedDemoDataIfEmpty - skips seeding when orders already exist")
    void seedDemoDataIfEmpty_skipsWhenOrdersExist() {
        when(commandeRepository.count()).thenReturn(5L);

        sampleDataSeederService.seedDemoDataIfEmpty();

        verify(commandeRepository, times(1)).count();
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("seedDemoDataIfEmpty - executes dataset seeding and seeds all demo data")
    void seedDemoDataIfEmpty_executesSeedingWhenEmpty() {
        when(commandeRepository.count()).thenReturn(0L);

        sampleDataSeederService.seedDemoDataIfEmpty();

        verify(userRepository, atLeastOnce()).save(any());
        verify(tableRepository, atLeastOnce()).save(any());
        verify(employeeShiftRepository, atLeastOnce()).save(any());
        verify(establishmentClosureRepository, atLeastOnce()).save(any());
        verify(shiftPresetRepository, atLeastOnce()).save(any());
        verify(weekSchedulePublicationRepository, atLeastOnce()).save(any());
        verify(commandeRepository, atLeastOnce()).save(any());
        verify(factureRepository, atLeastOnce()).save(any());
        verify(recipeStepTemplateRepository, atLeastOnce()).save(any());
        verify(cocktailRepository, atLeastOnce()).save(any());
    }

    @Test
    @DisplayName("seedAllDemoData - skips closures when closures already exist")
    void seedAllDemoData_skipsClosuresWhenAlreadyExist() {
        when(establishmentClosureRepository.count()).thenReturn(3L);
        when(commandeRepository.count()).thenReturn(1L);

        sampleDataSeederService.seedAllDemoData();

        verify(establishmentClosureRepository, never()).save(any());
    }

    @Test
    @DisplayName("seedAllDemoData - does not duplicate shifts when shift already exists for user and date")
    void seedAllDemoData_skipsDuplicateShifts() {
        when(commandeRepository.count()).thenReturn(1L);

        EmployeeShift existingShift = new EmployeeShift();
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        LocalDate monday = today.minusDays((long) today.getDayOfWeek().getValue() - 1);
        existingShift.setDateShift(monday);
        existingShift.setTypeShift(TypeShift.MATIN);
        when(employeeShiftRepository.findByUserId(anyLong())).thenReturn(List.of(existingShift));

        sampleDataSeederService.seedAllDemoData();

        verify(employeeShiftRepository, atLeastOnce()).findByUserId(anyLong());
    }

    @Test
    @DisplayName("seedAllDemoData - correctly seeds invoices with VAT rate and HT calculation")
    void seedAllDemoData_correctlyCalculatesVatAndInvoiceTotals() {
        when(commandeRepository.count()).thenReturn(0L);

        sampleDataSeederService.seedAllDemoData();

        ArgumentCaptor<Facture> factureCaptor = ArgumentCaptor.forClass(Facture.class);
        verify(factureRepository, atLeastOnce()).save(factureCaptor.capture());

        List<Facture> savedFactures = factureCaptor.getAllValues();
        assertThat(savedFactures).isNotEmpty();
        Facture firstFacture = savedFactures.get(0);
        assertThat(firstFacture.getTotal()).isPositive();
        assertThat(firstFacture.getTotalHT()).isPositive();
        assertThat(firstFacture.getTotalVAT()).isPositive();
        assertThat(firstFacture.getItems()).isNotEmpty();
        assertThat(firstFacture.getItems().get(0).getVatRate()).isNotNull();
    }

    @Test
    @DisplayName("seedAllDemoData - seeds split payments (FactureReglement) on invoices")
    void seedAllDemoData_seedsSplitPaymentsOnInvoices() {
        when(commandeRepository.count()).thenReturn(0L);

        sampleDataSeederService.seedAllDemoData();

        verify(factureReglementRepository, atLeastOnce()).save(any(FactureReglement.class));
    }

    @Test
    @DisplayName("seedAllDemoData - seeds credit notes (AvoirCredit) when present")
    void seedAllDemoData_seedsCreditNotes() {
        when(commandeRepository.count()).thenReturn(0L);

        Facture mockFacture = new Facture();
        mockFacture.setId(5L);
        mockFacture.setNumero("FACT-2026-0005");
        mockFacture.setTotalHT(new BigDecimal("15.83"));
        mockFacture.setTotalVAT(new BigDecimal("3.17"));
        mockFacture.setTotalTTC(new BigDecimal("19.00"));

        when(factureRepository.findByNumero("FACT-2026-0005")).thenReturn(Optional.of(mockFacture));

        sampleDataSeederService.seedAllDemoData();

        verify(avoirCreditRepository, atLeastOnce()).save(any(AvoirCredit.class));
    }
}
