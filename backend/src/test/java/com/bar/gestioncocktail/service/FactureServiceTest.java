package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.repository.FactureItemRepository;
import com.bar.gestioncocktail.repository.FactureRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FactureServiceTest {

    @Mock
    FactureRepository factureRepository;

    @Mock
    FactureItemRepository factureItemRepository;

    @Mock
    EntityManager entityManager;

    @InjectMocks
    FactureService factureService;

    @Test
    void createFacture_genereNumeroFormate() {
        // Arrange
        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.getSingleResult()).thenReturn(1L);
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArgument(0));

        Facture facture = new Facture();
        facture.setTotal(BigDecimal.TEN);
        facture.setTotalTTC(BigDecimal.TEN);

        // Act
        Facture result = factureService.createFacture(facture);

        // Assert
        assertThat(result.getNumero()).isNotNull();
        String moisAttendu = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        assertThat(result.getNumero()).isEqualTo("FAC-" + moisAttendu + "-0001");
    }

    @Test
    void createFacture_numeroIncrementeAvecSequence() {
        // Arrange
        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.getSingleResult()).thenReturn(42L);
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArgument(0));

        Facture facture = new Facture();
        facture.setTotal(BigDecimal.TEN);
        facture.setTotalTTC(BigDecimal.TEN);

        // Act
        Facture result = factureService.createFacture(facture);

        // Assert
        String moisAttendu = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        assertThat(result.getNumero()).isEqualTo("FAC-" + moisAttendu + "-0042");
    }

    @Test
    void createFacture_setDateFacture() {
        // Arrange
        Query mockQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.getSingleResult()).thenReturn(1L);
        when(factureRepository.save(any(Facture.class))).thenAnswer(i -> i.getArgument(0));

        Facture facture = new Facture();
        facture.setTotal(BigDecimal.TEN);
        facture.setTotalTTC(BigDecimal.TEN);

        // Act
        Facture result = factureService.createFacture(facture);

        // Assert
        assertThat(result.getDateFacture()).isNotNull();
        assertThat(result.getDateFacture()).isBeforeOrEqualTo(LocalDateTime.now());
    }
}
