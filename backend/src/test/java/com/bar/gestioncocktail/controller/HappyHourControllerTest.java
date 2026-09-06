package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.HappyHourRuleRequestDTO;
import com.bar.gestioncocktail.dto.HappyHourRuleResponseDTO;
import com.bar.gestioncocktail.dto.PricingPreviewResponseDTO;
import com.bar.gestioncocktail.model.CocktailCategorie;
import com.bar.gestioncocktail.model.DiscountType;
import com.bar.gestioncocktail.model.HappyHourRule;
import com.bar.gestioncocktail.service.HappyHourService;
import com.bar.gestioncocktail.service.TimeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link HappyHourController}.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("HappyHourController Unit Tests")
class HappyHourControllerTest {

    @Mock
    private HappyHourService happyHourService;

    @Mock
    private TimeService timeService;

    @InjectMocks
    private HappyHourController controller;

    private HappyHourRule rule;
    private final LocalDateTime referenceTime = LocalDateTime.of(2026, 9, 5, 18, 30);

    @BeforeEach
    void setUp() {
        rule = new HappyHourRule();
        rule.setId(1L);
        rule.setName("Friday Happy Hour");
        rule.setStartTime(LocalTime.of(18, 0));
        rule.setEndTime(LocalTime.of(20, 0));
        rule.setDaysOfWeek(Set.of(DayOfWeek.FRIDAY));
        rule.setDiscountType(DiscountType.PERCENTAGE);
        rule.setDiscountValue(new BigDecimal("25.00"));
        rule.setActive(true);
        rule.setCategories(Set.of(CocktailCategorie.ALCOOLISE));
        rule.setCocktailIds(Collections.emptySet());
        rule.setCreatedAt(referenceTime);
        rule.setUpdatedAt(referenceTime);
    }

    @Test
    @DisplayName("GET /api/happy-hour - Returns all rules with evaluated isActiveNow")
    void getAllRules_returnsRulesList() {
        when(timeService.now()).thenReturn(referenceTime);
        when(happyHourService.getAllRules()).thenReturn(List.of(rule));

        ResponseEntity<List<HappyHourRuleResponseDTO>> response = controller.getAllRules();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull().hasSize(1);
        assertThat(response.getBody().getFirst().name()).isEqualTo("Friday Happy Hour");
        verify(happyHourService).getAllRules();
    }

    @Test
    @DisplayName("GET /api/happy-hour/active - Returns only active rules")
    void getActiveRules_returnsActiveRulesList() {
        when(timeService.now()).thenReturn(referenceTime);
        when(happyHourService.getActiveRules()).thenReturn(List.of(rule));

        ResponseEntity<List<HappyHourRuleResponseDTO>> response = controller.getActiveRules();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull().hasSize(1);
        verify(happyHourService).getActiveRules();
    }

    @Test
    @DisplayName("GET /api/happy-hour/{id} - Returns rule when found")
    void getRuleById_found_returnsRuleDto() {
        when(timeService.now()).thenReturn(referenceTime);
        when(happyHourService.getRuleById(1L)).thenReturn(Optional.of(rule));

        ResponseEntity<HappyHourRuleResponseDTO> response = controller.getRuleById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("GET /api/happy-hour/{id} - Returns 404 when not found")
    void getRuleById_notFound_returns404() {
        when(timeService.now()).thenReturn(referenceTime);
        when(happyHourService.getRuleById(99L)).thenReturn(Optional.empty());

        ResponseEntity<HappyHourRuleResponseDTO> response = controller.getRuleById(99L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("POST /api/happy-hour - Creates new rule and returns 201 Created")
    void createRule_validPayload_returnsCreated() {
        HappyHourRuleRequestDTO request = new HappyHourRuleRequestDTO(
                "New Happy Hour",
                LocalTime.of(17, 0),
                LocalTime.of(19, 0),
                Set.of(DayOfWeek.THURSDAY),
                DiscountType.FIXED_DISCOUNT,
                new BigDecimal("2.00"),
                true,
                Set.of(CocktailCategorie.ALCOOLISE),
                Collections.emptySet()
        );

        when(timeService.now()).thenReturn(referenceTime);
        when(happyHourService.createRule(any(HappyHourRule.class))).thenReturn(rule);

        ResponseEntity<HappyHourRuleResponseDTO> response = controller.createRule(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        verify(happyHourService).createRule(any(HappyHourRule.class));
    }

    @Test
    @DisplayName("PUT /api/happy-hour/{id} - Updates rule and returns 200 OK")
    void updateRule_validPayload_returnsUpdated() {
        HappyHourRuleRequestDTO request = new HappyHourRuleRequestDTO(
                "Updated Name",
                LocalTime.of(17, 0),
                LocalTime.of(19, 0),
                Set.of(DayOfWeek.THURSDAY),
                DiscountType.PERCENTAGE,
                new BigDecimal("30.00"),
                true,
                Collections.emptySet(),
                Collections.emptySet()
        );

        when(timeService.now()).thenReturn(referenceTime);
        when(happyHourService.updateRule(eq(1L), any(HappyHourRule.class))).thenReturn(rule);

        ResponseEntity<HappyHourRuleResponseDTO> response = controller.updateRule(1L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        verify(happyHourService).updateRule(eq(1L), any(HappyHourRule.class));
    }

    @Test
    @DisplayName("DELETE /api/happy-hour/{id} - Deletes rule and returns 204 No Content")
    void deleteRule_existingId_returnsNoContent() {
        ResponseEntity<Void> response = controller.deleteRule(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(happyHourService).deleteRule(1L);
    }

    @Test
    @DisplayName("PATCH /api/happy-hour/{id}/toggle - Toggles active flag and returns 200 OK")
    void toggleActive_existingId_returnsUpdatedDto() {
        when(timeService.now()).thenReturn(referenceTime);
        when(happyHourService.toggleActive(1L)).thenReturn(rule);

        ResponseEntity<HappyHourRuleResponseDTO> response = controller.toggleActive(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(happyHourService).toggleActive(1L);
    }

    @Test
    @DisplayName("GET /api/happy-hour/pricing-preview - Simulates drink pricing and returns simulation result")
    void simulatePricing_validQuery_returnsSimulation() {
        PricingPreviewResponseDTO previewDto = new PricingPreviewResponseDTO(
                10L,
                "Mojito",
                null,
                null,
                new BigDecimal("10.00"),
                new BigDecimal("7.50"),
                new BigDecimal("2.50"),
                new BigDecimal("25.00"),
                true,
                1L,
                "Friday Happy Hour",
                DiscountType.PERCENTAGE,
                new BigDecimal("25.00"),
                referenceTime
        );

        when(happyHourService.simulatePricing(10L, null, referenceTime)).thenReturn(previewDto);

        ResponseEntity<PricingPreviewResponseDTO> response = controller.simulatePricing(10L, null, referenceTime);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isHappyHour()).isTrue();
        assertThat(response.getBody().effectivePrice()).isEqualByComparingTo("7.50");
        verify(happyHourService).simulatePricing(10L, null, referenceTime);
    }
}
