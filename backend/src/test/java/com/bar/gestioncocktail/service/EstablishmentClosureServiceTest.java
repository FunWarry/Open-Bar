package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.EstablishmentClosureDTO;
import com.bar.gestioncocktail.dto.EstablishmentClosureRequestDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.ClosureType;
import com.bar.gestioncocktail.model.EstablishmentClosure;
import com.bar.gestioncocktail.repository.EstablishmentClosureRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EstablishmentClosureService Unit Tests")
class EstablishmentClosureServiceTest {

    @Mock
    private EstablishmentClosureRepository repository;

    @InjectMocks
    private EstablishmentClosureService service;

    private EstablishmentClosure weeklyMonday;
    private EstablishmentClosure summerHoliday;
    private EstablishmentClosure annualChristmas;

    @BeforeEach
    void setUp() {
        weeklyMonday = new EstablishmentClosure();
        weeklyMonday.setId(1L);
        weeklyMonday.setType(ClosureType.WEEKLY_RECURRING);
        weeklyMonday.setDayOfWeek(DayOfWeek.MONDAY);
        weeklyMonday.setReason("Fermeture hebdomadaire");

        summerHoliday = new EstablishmentClosure();
        summerHoliday.setId(2L);
        summerHoliday.setType(ClosureType.EXCEPTIONAL);
        summerHoliday.setClosureDate(LocalDate.of(2026, 8, 1));
        summerHoliday.setEndDate(LocalDate.of(2026, 8, 15));
        summerHoliday.setIsAnnualRecurring(false);
        summerHoliday.setReason("Congés annuels");

        annualChristmas = new EstablishmentClosure();
        annualChristmas.setId(3L);
        annualChristmas.setType(ClosureType.EXCEPTIONAL);
        annualChristmas.setClosureDate(LocalDate.of(2025, 12, 25));
        annualChristmas.setEndDate(LocalDate.of(2026, 1, 2));
        annualChristmas.setIsAnnualRecurring(true);
        annualChristmas.setReason("Fêtes de fin d'année");
    }

    @Test
    @DisplayName("getAllClosures - Returns all mapped closure DTOs")
    void getAllClosures_returnsList() {
        when(repository.findAll()).thenReturn(List.of(weeklyMonday, summerHoliday));

        List<EstablishmentClosureDTO> result = service.getAllClosures();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).dayOfWeek()).isEqualTo(DayOfWeek.MONDAY);
        assertThat(result.get(1).reason()).isEqualTo("Congés annuels");
    }

    @Test
    @DisplayName("isClosedOnDate - Returns false for null date")
    void isClosedOnDate_nullDate_returnsFalse() {
        assertThat(service.isClosedOnDate(null)).isFalse();
    }

    @Test
    @DisplayName("isClosedOnDate - Returns true when weekly recurring closed day matches")
    void isClosedOnDate_weeklyRecurring_returnsTrue() {
        LocalDate monday = LocalDate.of(2026, 8, 10);
        when(repository.findByTypeAndDayOfWeek(ClosureType.WEEKLY_RECURRING, DayOfWeek.MONDAY))
                .thenReturn(Optional.of(weeklyMonday));

        boolean closed = service.isClosedOnDate(monday);

        assertThat(closed).isTrue();
    }

    @Test
    @DisplayName("isClosedOnDate - Returns true when target date falls inside exceptional closure range")
    void isClosedOnDate_exceptionalRange_returnsTrue() {
        LocalDate august5th = LocalDate.of(2026, 8, 5);
        when(repository.findByTypeAndDayOfWeek(ClosureType.WEEKLY_RECURRING, august5th.getDayOfWeek()))
                .thenReturn(Optional.empty());
        when(repository.findByType(ClosureType.EXCEPTIONAL)).thenReturn(List.of(summerHoliday));

        boolean closed = service.isClosedOnDate(august5th);

        assertThat(closed).isTrue();
    }

    @Test
    @DisplayName("isClosedOnDate - Returns true when annual recurring year-crossing closure matches")
    void isClosedOnDate_annualRecurring_returnsTrue() {
        LocalDate dec30th2028 = LocalDate.of(2028, 12, 30);
        when(repository.findByTypeAndDayOfWeek(ClosureType.WEEKLY_RECURRING, dec30th2028.getDayOfWeek()))
                .thenReturn(Optional.empty());
        when(repository.findByType(ClosureType.EXCEPTIONAL)).thenReturn(List.of(annualChristmas));

        boolean closed = service.isClosedOnDate(dec30th2028);

        assertThat(closed).isTrue();
    }

    @Test
    @DisplayName("isClosedOnDate - Returns false when date has no closures")
    void isClosedOnDate_openDate_returnsFalse() {
        LocalDate openDate = LocalDate.of(2026, 9, 15);
        when(repository.findByTypeAndDayOfWeek(ClosureType.WEEKLY_RECURRING, openDate.getDayOfWeek()))
                .thenReturn(Optional.empty());
        when(repository.findByType(ClosureType.EXCEPTIONAL)).thenReturn(List.of(summerHoliday));

        boolean closed = service.isClosedOnDate(openDate);

        assertThat(closed).isFalse();
    }

    @Test
    @DisplayName("createClosure - Valid weekly recurring closure creates successfully")
    void createClosure_weeklyRecurring_success() {
        EstablishmentClosureRequestDTO req = new EstablishmentClosureRequestDTO(
                ClosureType.WEEKLY_RECURRING,
                DayOfWeek.TUESDAY,
                null,
                null,
                false,
                "Fermé le mardi"
        );
        when(repository.findByTypeAndDayOfWeek(ClosureType.WEEKLY_RECURRING, DayOfWeek.TUESDAY))
                .thenReturn(Optional.empty());
        when(repository.save(any(EstablishmentClosure.class))).thenAnswer(inv -> {
            EstablishmentClosure entity = inv.getArgument(0);
            entity.setId(10L);
            return entity;
        });

        EstablishmentClosureDTO created = service.createClosure(req);

        assertThat(created.id()).isEqualTo(10L);
        assertThat(created.dayOfWeek()).isEqualTo(DayOfWeek.TUESDAY);
        assertThat(created.reason()).isEqualTo("Fermé le mardi");
    }

    @Test
    @DisplayName("createClosure - Throws BusinessException if weekly closed day already exists")
    void createClosure_duplicateWeekly_throwsException() {
        EstablishmentClosureRequestDTO req = new EstablishmentClosureRequestDTO(
                ClosureType.WEEKLY_RECURRING,
                DayOfWeek.MONDAY,
                null,
                null,
                false,
                "Fermé le lundi"
        );
        when(repository.findByTypeAndDayOfWeek(ClosureType.WEEKLY_RECURRING, DayOfWeek.MONDAY))
                .thenReturn(Optional.of(weeklyMonday));

        assertThatThrownBy(() -> service.createClosure(req))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    @DisplayName("createClosure - Valid exceptional closure creates successfully")
    void createClosure_exceptional_success() {
        EstablishmentClosureRequestDTO req = new EstablishmentClosureRequestDTO(
                ClosureType.EXCEPTIONAL,
                null,
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 3),
                true,
                "Toussaint"
        );
        when(repository.save(any(EstablishmentClosure.class))).thenAnswer(inv -> {
            EstablishmentClosure entity = inv.getArgument(0);
            entity.setId(20L);
            return entity;
        });

        EstablishmentClosureDTO created = service.createClosure(req);

        assertThat(created.id()).isEqualTo(20L);
        assertThat(created.closureDate()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(created.endDate()).isEqualTo(LocalDate.of(2026, 11, 3));
    }

    @Test
    @DisplayName("createClosure - Throws BusinessException when required fields are missing")
    void createClosure_validationErrors() {
        EstablishmentClosureRequestDTO reqNullType = new EstablishmentClosureRequestDTO(null, null, null, null, false, null);
        assertThatThrownBy(() -> service.createClosure(reqNullType))
                .isInstanceOf(BusinessException.class);

        EstablishmentClosureRequestDTO reqWeeklyNoDay = new EstablishmentClosureRequestDTO(ClosureType.WEEKLY_RECURRING, null, null, null, false, null);
        assertThatThrownBy(() -> service.createClosure(reqWeeklyNoDay))
                .isInstanceOf(BusinessException.class);

        EstablishmentClosureRequestDTO reqExceptionalNoDate = new EstablishmentClosureRequestDTO(ClosureType.EXCEPTIONAL, null, null, null, false, null);
        assertThatThrownBy(() -> service.createClosure(reqExceptionalNoDate))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("deleteClosure - Deletes existing closure successfully")
    void deleteClosure_success() {
        when(repository.findById(1L)).thenReturn(Optional.of(weeklyMonday));

        service.deleteClosure(1L);

        verify(repository).delete(weeklyMonday);
    }

    @Test
    @DisplayName("deleteClosure - Throws ResourceNotFoundException for missing ID")
    void deleteClosure_notFound_throwsException() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteClosure(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
