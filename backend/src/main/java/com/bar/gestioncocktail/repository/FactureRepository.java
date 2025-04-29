package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.TableEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FactureRepository extends JpaRepository<Facture, Long> {
    List<Facture> findByTable(TableEntity table);
    List<Facture> findByReglee(boolean reglee);
    List<Facture> findByDateReglementBetween(LocalDateTime debut, LocalDateTime fin);
    List<Facture> findByModePaiement(String modePaiement);
    List<Facture> findByTableAndReglee(TableEntity table, boolean reglee);
    List<Facture> findByDateFactureBetween(LocalDateTime debut, LocalDateTime fin);
    List<Facture> findByTableAndDateFactureBetween(TableEntity table, LocalDateTime debut, LocalDateTime fin);
} 