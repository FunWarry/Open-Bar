package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.service.TableService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TableControllerTest {

    @Mock
    TableService tableService;

    @InjectMocks
    TableController tableController;

    private TableEntity table;

    @BeforeEach
    void setUp() {
        table = new TableEntity();
        table.setId(1L);
        table.setNumero(1);
    }

    @Test
    void transfererCommandes_appelleServiceEtRetourneTableDTO() {
        TableEntity target = new TableEntity();
        target.setId(2L);
        target.setNumero(2);
        target.setOccupee(true);

        when(tableService.transfererCommandes(1L, 2L)).thenReturn(target);

        ResponseEntity<?> response = tableController.transfererCommandes(1L, 2L);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(tableService).transfererCommandes(1L, 2L);
    }
}
