package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import com.bar.gestioncocktail.model.CommandeItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FactureItemRepository extends JpaRepository<FactureItem, Long> {
    List<FactureItem> findByFacture(Facture facture);
    List<FactureItem> findByCommandeItem(CommandeItem commandeItem);
    List<FactureItem> findByDescriptionContainingIgnoreCase(String description);
} 