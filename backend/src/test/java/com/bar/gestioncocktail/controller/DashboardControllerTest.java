package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.DashboardStatsDTO;
import com.bar.gestioncocktail.service.DashboardService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardControllerTest {

    @Mock
    DashboardService dashboardService;

    @InjectMocks
    DashboardController controller;

    @Test
    @DisplayName("getStats - returns dashboard stats DTO")
    void getStats_success() {
        DashboardStatsDTO stats = new DashboardStatsDTO(10L, 2L, 3L, 4L, 1L, new BigDecimal("150.00"), new BigDecimal("3000.00"), 4L, 10L, List.of(), 0L);
        when(dashboardService.getStats()).thenReturn(stats);

        ResponseEntity<DashboardStatsDTO> response = controller.getStats();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().commandesTotales()).isEqualTo(10L);
    }
}
