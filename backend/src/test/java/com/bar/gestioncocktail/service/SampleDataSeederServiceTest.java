package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

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
    private EmployeeShiftRepository employeeShiftRepository;

    @Mock
    private EstablishmentClosureRepository establishmentClosureRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private TimeService timeService;

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
            if (t.getId() == null) t.setId(1L);
            return t;
        });

        Ingredient mockIng = new Ingredient();
        mockIng.setId(1L);
        mockIng.setNom("Rhum Blanc");
        lenient().when(ingredientRepository.findByNomIgnoreCase(any())).thenReturn(Optional.of(mockIng));

        Cocktail mockMojito = new Cocktail();
        mockMojito.setId(1L);
        mockMojito.setNom("Mojito");
        mockMojito.setRecipeSteps(new ArrayList<>());
        lenient().when(cocktailRepository.findByNomIgnoreCase(any())).thenReturn(Optional.of(mockMojito));
        lenient().when(cocktailRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
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
    @DisplayName("seedDemoDataIfEmpty - executes dataset seeding and seeds recipe steps")
    void seedDemoDataIfEmpty_executesSeedingWhenEmpty() {
        when(commandeRepository.count()).thenReturn(0L);
        when(userRepository.findByUsername(any())).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            if (u.getId() == null) u.setId(1L);
            return u;
        });

        lenient().when(etageRepository.existsByCode(any())).thenReturn(false);
        lenient().when(zoneRepository.existsByNom(any())).thenReturn(false);
        lenient().when(establishmentClosureRepository.count()).thenReturn(0L);

        TableEntity mockTable = new TableEntity();
        mockTable.setNumero(1);
        mockTable.setId(1L);
        when(tableRepository.findByNumero(anyInt())).thenReturn(Optional.of(mockTable));
        when(tableRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Cocktail mockCocktail = new Cocktail();
        mockCocktail.setId(1L);
        mockCocktail.setNom("Mojito");
        mockCocktail.setPrix(new BigDecimal("9.50"));
        when(cocktailRepository.findAll()).thenReturn(List.of(mockCocktail));

        sampleDataSeederService.seedDemoDataIfEmpty();

        verify(userRepository, atLeastOnce()).save(any());
        verify(tableRepository, atLeastOnce()).save(any());
        verify(employeeShiftRepository, atLeastOnce()).save(any());
        verify(establishmentClosureRepository, atLeastOnce()).save(any());
        verify(commandeRepository, atLeastOnce()).save(any());
        verify(factureRepository, atLeastOnce()).save(any());
        verify(recipeStepTemplateRepository, atLeastOnce()).save(any());
        verify(cocktailRepository, atLeastOnce()).save(any());
    }

    @Test
    @DisplayName("seedAllDemoData - skips closures when closures already exist")
    void seedAllDemoData_skipsClosuresWhenAlreadyExist() {
        when(userRepository.findByUsername(any())).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            if (u.getId() == null) u.setId(1L);
            return u;
        });
        TableEntity mockTable = new TableEntity();
        mockTable.setNumero(1);
        mockTable.setId(1L);
        when(tableRepository.findByNumero(anyInt())).thenReturn(Optional.of(mockTable));
        when(tableRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(establishmentClosureRepository.count()).thenReturn(3L);
        when(commandeRepository.count()).thenReturn(1L);

        sampleDataSeederService.seedAllDemoData();

        verify(establishmentClosureRepository, never()).save(any());
    }

    @Test
    @DisplayName("seedAllDemoData - does not duplicate shifts when shift already exists for user and date")
    void seedAllDemoData_skipsDuplicateShifts() {
        when(userRepository.findByUsername(any())).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            if (u.getId() == null) u.setId(1L);
            return u;
        });
        TableEntity mockTable = new TableEntity();
        mockTable.setNumero(1);
        mockTable.setId(1L);
        when(tableRepository.findByNumero(anyInt())).thenReturn(Optional.of(mockTable));
        when(tableRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(establishmentClosureRepository.count()).thenReturn(3L);
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
}
