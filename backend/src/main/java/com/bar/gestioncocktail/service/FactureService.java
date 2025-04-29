package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.FactureRepository;
import com.bar.gestioncocktail.repository.FactureItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class FactureService {
    private final FactureRepository factureRepository;
    private final FactureItemRepository factureItemRepository;

    @Autowired
    public FactureService(FactureRepository factureRepository, FactureItemRepository factureItemRepository) {
        this.factureRepository = factureRepository;
        this.factureItemRepository = factureItemRepository;
    }

    public List<Facture> getAllFactures() {
        return factureRepository.findAll();
    }

    public Optional<Facture> getFactureById(Long id) {
        return factureRepository.findById(id);
    }

    public List<Facture> getFacturesByTable(TableEntity table) {
        return factureRepository.findByTable(table);
    }

    public List<Facture> getFacturesByDate(LocalDateTime debut, LocalDateTime fin) {
        return factureRepository.findByDateFactureBetween(debut, fin);
    }

    @Transactional
    public Facture createFacture(Facture facture) {
        facture.setDateFacture(LocalDateTime.now());
        return factureRepository.save(facture);
    }

    @Transactional
    public Facture updateFacture(Long id, Facture factureDetails) {
        Facture facture = factureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Facture non trouvée avec l'id: " + id));

        facture.setTable(factureDetails.getTable());
        facture.setItems(factureDetails.getItems());
        facture.setTotal(factureDetails.getTotal());
        facture.setReglee(factureDetails.isReglee());
        facture.setModePaiement(factureDetails.getModePaiement());

        return factureRepository.save(facture);
    }

    @Transactional
    public void deleteFacture(Long id) {
        factureRepository.deleteById(id);
    }

    @Transactional
    public Facture ajouterItem(Long factureId, FactureItem item) {
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new RuntimeException("Facture non trouvée avec l'id: " + factureId));

        facture.getItems().add(item);
        facture.setTotal(facture.getTotal().add(item.getPrixUnitaire().multiply(new BigDecimal(item.getQuantite()))));

        return factureRepository.save(facture);
    }

    @Transactional
    public Facture retirerItem(Long factureId, Long itemId) {
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new RuntimeException("Facture non trouvée avec l'id: " + factureId));

        facture.getItems().removeIf(item -> item.getId().equals(itemId));
        facture.setTotal(facture.getItems().stream()
                .map(item -> item.getPrixUnitaire().multiply(new BigDecimal(item.getQuantite())))
                .reduce(BigDecimal.ZERO, BigDecimal::add));

        return factureRepository.save(facture);
    }

    @Transactional
    public Facture reglerFacture(Long id, String modePaiement) {
        Facture facture = factureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Facture non trouvée avec l'id: " + id));

        facture.setReglee(true);
        facture.setModePaiement(modePaiement);
        facture.setDateReglement(LocalDateTime.now());

        return factureRepository.save(facture);
    }

    public List<Facture> getFacturesReglees() {
        return factureRepository.findByReglee(true);
    }

    public List<Facture> getFacturesByDateEmission(LocalDateTime debut, LocalDateTime fin) {
        return factureRepository.findByDateFactureBetween(debut, fin);
    }

    public List<Facture> getFacturesByDateReglement(LocalDateTime debut, LocalDateTime fin) {
        return factureRepository.findByDateReglementBetween(debut, fin);
    }

    public List<Facture> getFacturesByModePaiement(String modePaiement) {
        return factureRepository.findByModePaiement(modePaiement);
    }

    public void ajouterPourboire(Facture facture, BigDecimal pourboire) {
        facture.setPourboire(pourboire);
        facture.setTotalTTC(facture.getTotal().add(pourboire));
        facture.setUpdatedAt(LocalDateTime.now());
        factureRepository.save(facture);
    }
} 