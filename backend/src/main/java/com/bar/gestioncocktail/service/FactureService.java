package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.MergeFacturesRequestDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.dto.SplitAdditionRequest;
import com.bar.gestioncocktail.dto.SplitResultDTO;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.model.FactureItem;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.FactureRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class FactureService {
    private final FactureRepository factureRepository;
    private final TableRepository tableRepository;
    private final EntityManager entityManager;
    private final AuditLogService auditLogService;

    @Autowired
    public FactureService(FactureRepository factureRepository, TableRepository tableRepository, EntityManager entityManager, AuditLogService auditLogService) {
        this.factureRepository = factureRepository;
        this.tableRepository = tableRepository;
        this.entityManager = entityManager;
        this.auditLogService = auditLogService;
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
        long sequence = ((Number) entityManager.createNativeQuery("SELECT NEXTVAL('facture_seq')").getSingleResult()).longValue();
        String mois = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        facture.setNumero(String.format("FAC-%s-%04d", mois, sequence));
        return factureRepository.save(facture);
    }

    @Transactional
    public Facture updateFacture(Long id, Facture factureDetails) {
        Facture facture = factureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée avec l'id: " + id));

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
                .orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée avec l'id: " + factureId));

        facture.getItems().add(item);
        facture.setTotal(facture.getTotal().add(item.getPrixUnitaire().multiply(new BigDecimal(item.getQuantite()))));

        return factureRepository.save(facture);
    }

    @Transactional
    public Facture retirerItem(Long factureId, Long itemId) {
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée avec l'id: " + factureId));

        facture.getItems().removeIf(item -> item.getId().equals(itemId));
        facture.setTotal(facture.getItems().stream()
                .map(item -> item.getPrixUnitaire().multiply(new BigDecimal(item.getQuantite())))
                .reduce(BigDecimal.ZERO, (a, b) -> a.add(b)));

        return factureRepository.save(facture);
    }

    @Transactional
    public Facture reglerFacture(Long id, String modePaiement) {
        Facture facture = factureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée avec l'id: " + id));

        facture.setReglee(true);
        facture.setModePaiement(modePaiement);
        facture.setDateReglement(LocalDateTime.now());

        if (facture.getTable() != null) {
            TableEntity table = facture.getTable();
            table.setOccupee(false);
            entityManager.merge(table);
        }

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

    /**
     * Split égal : divise le total TTC (ou total si pas de pourboire) en N parts égales.
     * Ne crée pas de sous-factures — retourne uniquement le calcul.
     */
    public List<SplitResultDTO> splitEgal(Long factureId, int nombreConvives) {
        if (nombreConvives < 2 || nombreConvives > 20) {
            throw new IllegalArgumentException("Le nombre de convives doit être compris entre 2 et 20");
        }
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée: " + factureId));

        BigDecimal base = facture.getTotalTTC() != null ? facture.getTotalTTC()
                : (facture.getTotal() != null ? facture.getTotal() : BigDecimal.ZERO);
        BigDecimal partParPersonne = base.divide(BigDecimal.valueOf(nombreConvives), 2, RoundingMode.HALF_UP);

        List<SplitResultDTO> result = new ArrayList<>();
        for (int i = 1; i <= nombreConvives; i++) {
            result.add(new SplitResultDTO(
                    factureId,
                    "Convive " + i,
                    List.of(),
                    partParPersonne,
                    partParPersonne
            ));
        }
        return result;
    }

    /**
     * Split par sélection d'articles : chaque convive indique les itemIds qu'il prend en charge.
     * Vérifie que chaque itemId appartient bien à la facture.
     */
    public List<SplitResultDTO> splitParSelection(Long factureId, SplitAdditionRequest request) {
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée: " + factureId));

        // Index des items de la facture par id pour lookup O(1)
        java.util.Map<Long, FactureItem> itemsIndex = facture.getItems().stream()
                .collect(Collectors.toMap(item -> item.getId(), item -> item));

        List<SplitResultDTO> result = new ArrayList<>();

        for (com.bar.gestioncocktail.dto.SplitPartRequest part : request.parts()) {
            List<SplitResultDTO.SplitItemDTO> splitItems = new ArrayList<>();
            BigDecimal sousTotal = BigDecimal.ZERO;

            for (Long itemId : part.itemIds()) {
                FactureItem item = itemsIndex.get(itemId);
                if (item == null) {
                    throw new IllegalArgumentException(
                            "L'item " + itemId + " n'appartient pas à la facture " + factureId);
                }
                splitItems.add(new SplitResultDTO.SplitItemDTO(
                        item.getId(),
                        item.getDescription(),
                        item.getQuantite(),
                        item.getPrixUnitaire(),
                        item.getTotal()
                ));
                sousTotal = sousTotal.add(item.getTotal());
            }

            result.add(new SplitResultDTO(
                    factureId,
                    part.nomConvive(),
                    splitItems,
                    sousTotal,
                    sousTotal
            ));
        }

        return result;
    }

    @Transactional
    public Facture fusionnerFactures(MergeFacturesRequestDTO request) {
        List<Facture> factures = factureRepository.findAllById(request.factureIds());
        if (factures.size() < 2) {
            throw new BusinessException("Au moins 2 factures valides sont requises pour la fusion.");
        }

        for (Facture f : factures) {
            if (f.isReglee()) {
                throw new BusinessException("La facture " + f.getNumero() + " est déjà réglée et ne peut pas être fusionnée.");
            }
        }

        TableEntity tableCible = request.targetTableId() != null
                ? tableRepository.findById(request.targetTableId()).orElse(factures.get(0).getTable())
                : factures.get(0).getTable();

        Facture merged = new Facture();
        merged.setTable(tableCible);
        long sequence = ((Number) entityManager.createNativeQuery("SELECT NEXTVAL('facture_seq')").getSingleResult()).longValue();
        String mois = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        merged.setNumero(String.format("FAC-MERGE-%s-%04d", mois, sequence));
        merged.setDateFacture(LocalDateTime.now());
        merged.setReglee(false);

        BigDecimal total = BigDecimal.ZERO;
        List<FactureItem> newItems = new ArrayList<>();

        for (Facture f : factures) {
            if (f.getItems() != null) {
                for (FactureItem item : f.getItems()) {
                    FactureItem newItem = new FactureItem();
                    newItem.setFacture(merged);
                    newItem.setCommandeItem(item.getCommandeItem());
                    newItem.setQuantite(item.getQuantite());
                    newItem.setPrixUnitaire(item.getPrixUnitaire());
                    newItem.setTotal(item.getTotal());
                    newItem.setDescription(item.getDescription());
                    newItems.add(newItem);
                    if (item.getTotal() != null) {
                        total = total.add(item.getTotal());
                    } else if (item.getPrixUnitaire() != null) {
                        total = total.add(item.getPrixUnitaire().multiply(BigDecimal.valueOf(item.getQuantite())));
                    }
                }
            }
            f.setReglee(true);
            f.setModePaiement("FUSIONNE");
            f.setNotes("Fusionnée dans la facture " + merged.getNumero());
            factureRepository.save(f);
        }

        merged.setItems(newItems);
        merged.setTotal(total);
        merged.setTotalTTC(total);

        Facture saved = factureRepository.save(merged);

        auditLogService.logAction(null, "FUSION_FACTURES", "Facture", saved.getId(),
                "Fusion de " + factures.size() + " factures en " + saved.getNumero(), null);

        return saved;
    }
} 