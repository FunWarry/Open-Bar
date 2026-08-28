package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.TablePositionDTO;
import com.bar.gestioncocktail.dto.TableResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.repository.CommandeRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TableService {

    private static final String TABLE_NOT_FOUND_MSG = "Table not found with id: ";

    private final TableRepository tableRepository;
    private final CommandeRepository commandeRepository;
    private final com.bar.gestioncocktail.repository.FactureRepository factureRepository;
    private final AuditLogService auditLogService;
    private final TimeService timeService;
    private final SimpMessagingTemplate messagingTemplate;

    public TableService(TableRepository tableRepository,
                        CommandeRepository commandeRepository,
                        com.bar.gestioncocktail.repository.FactureRepository factureRepository,
                        AuditLogService auditLogService,
                        TimeService timeService,
                        SimpMessagingTemplate messagingTemplate) {
        this.tableRepository = tableRepository;
        this.commandeRepository = commandeRepository;
        this.factureRepository = factureRepository;
        this.auditLogService = auditLogService;
        this.timeService = timeService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public List<TableEntity> getAllTables() {
        List<TableEntity> tables = tableRepository.findAll();
        for (TableEntity t : tables) {
            synchronizeTableOccupancy(t);
        }
        return tables;
    }

    @Transactional
    public Optional<TableEntity> getTableById(Long id) {
        Optional<TableEntity> opt = tableRepository.findById(id);
        opt.ifPresent(this::synchronizeTableOccupancy);
        return opt;
    }

    @Transactional
    public List<TableEntity> getTablesByZone(String zone) {
        List<TableEntity> tables = tableRepository.findByZone(zone);
        for (TableEntity t : tables) {
            synchronizeTableOccupancy(t);
        }
        return tables;
    }

    public List<String> getAllZones() {
        return tableRepository.findDistinctZones();
    }

    @Transactional
    public List<TableEntity> getTablesByOccupee(boolean occupee) {
        List<TableEntity> allTables = tableRepository.findAll();
        for (TableEntity t : allTables) {
            synchronizeTableOccupancy(t);
        }
        return tableRepository.findByOccupee(occupee);
    }

    @Transactional
    public List<TableEntity> getTablesByServeurId(Long serveurId) {
        List<TableEntity> tables = tableRepository.findByServeurId(serveurId);
        for (TableEntity t : tables) {
            synchronizeTableOccupancy(t);
        }
        return tables;
    }

    private void synchronizeTableOccupancy(TableEntity table) {
        if (table == null || table.getId() == null) {
            return;
        }
        boolean hasActiveOrders = commandeRepository.existsByTableAndStatutIn(
                table, List.of(CommandeStatut.EN_ATTENTE, CommandeStatut.EN_PREPARATION, CommandeStatut.PRET));
        if (hasActiveOrders && !table.isOccupee()) {
            table.setOccupee(true);
            if (table.getDateOccupation() == null) {
                table.setDateOccupation(timeService.now());
            }
            tableRepository.save(table);
        }
    }

    @Transactional
    public TableEntity createTable(TableEntity table) {
        TableEntity saved = tableRepository.save(table);
        notifyTableUpdated(saved);
        return saved;
    }

    /**
     * Updates table configuration details (number, capacity, zone, floor plan attributes)
     * while preserving its current operational state (occupation, server, timestamps).
     *
     * @param id           The ID of the table to update
     * @param tableDetails The updated table attributes
     * @return The saved table entity
     */
    @Transactional
    public TableEntity updateTable(Long id, TableEntity tableDetails) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + id));

        table.setNumero(tableDetails.getNumero());
        table.setCapacite(tableDetails.getCapacite());
        table.setZone(tableDetails.getZone());

        if (tableDetails.getPlanX() != null) {
            table.setPlanX(tableDetails.getPlanX());
        }
        if (tableDetails.getPlanY() != null) {
            table.setPlanY(tableDetails.getPlanY());
        }
        if (tableDetails.getPlanRotation() != null) {
            table.setPlanRotation(tableDetails.getPlanRotation());
        }
        if (tableDetails.getPlanForme() != null) {
            table.setPlanForme(tableDetails.getPlanForme());
        }
        if (tableDetails.getPlanWidth() != null) {
            table.setPlanWidth(tableDetails.getPlanWidth());
        }
        if (tableDetails.getPlanHeight() != null) {
            table.setPlanHeight(tableDetails.getPlanHeight());
        }

        TableEntity saved = tableRepository.save(table);
        notifyTableUpdated(saved);
        return saved;
    }

    /**
     * Deletes a table by ID after verifying that it exists and has no active orders.
     *
     * @param id Identifier of the table to delete
     * @throws ResourceNotFoundException if table does not exist
     * @throws BusinessException if table currently has active orders
     */
    @Transactional
    public void deleteTable(Long id) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + id));

        boolean hasActiveOrders = commandeRepository.existsByTableAndStatutIn(
                table, List.of(CommandeStatut.EN_ATTENTE, CommandeStatut.EN_PREPARATION, CommandeStatut.PRET));
        if (hasActiveOrders) {
            throw new BusinessException("Cannot delete table with active orders. Please settle or cancel orders first.");
        }

        // Detach table from historical completed orders and invoices before deletion
        commandeRepository.detachTableFromCommandes(id);
        factureRepository.detachTableFromFactures(id);

        tableRepository.delete(table);
        notifyTableDeleted(id);

        if (auditLogService != null) {
            auditLogService.logAction(null, "DELETE", "TableEntity", id,
                    "Delete table #" + table.getNumero(), null);
        }
    }

    @Transactional
    public TableEntity occuperTable(Long id, Long serveurId) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + id));

        if (table.isOccupee()) {
            throw new BusinessException("Table is already occupied");
        }

        table.setOccupee(true);
        table.setServeurId(serveurId);
        table.setDateOccupation(LocalDateTime.now(timeService.getZoneId()));
        table.setDateLiberation(null);

        TableEntity saved = tableRepository.save(table);
        notifyTableUpdated(saved);
        return saved;
    }

    @Transactional
    public TableEntity libererTable(Long id) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + id));

        if (!table.isOccupee()) {
            throw new BusinessException("Table is not occupied");
        }

        table.setOccupee(false);
        table.setServeurId(null);
        table.setDateOccupation(null);
        table.setDateLiberation(LocalDateTime.now(timeService.getZoneId()));

        TableEntity saved = tableRepository.save(table);
        notifyTableUpdated(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<TableEntity> getAllTablesAvecPositions() {
        return tableRepository.findAll();
    }

    @Transactional
    public TableEntity updatePosition(Long id, Double x, Double y, Double rotation, String forme) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + id));
        table.setPlanX(x);
        table.setPlanY(y);
        table.setPlanRotation(rotation != null ? rotation : 0.0);
        if (forme != null && (forme.equals("CARRE") || forme.equals("ROND"))) {
            table.setPlanForme(forme);
        }
        TableEntity saved = tableRepository.save(table);
        notifyTableUpdated(saved);
        return saved;
    }

    @Transactional
    public void updatePositionsBatch(List<TablePositionDTO> positions) {
        if (positions == null) return;
        positions.stream()
                .filter(dto -> dto != null && dto.id() != null)
                .forEach(this::updateSingleTablePosition);
    }

    private void updateSingleTablePosition(TablePositionDTO dto) {
        tableRepository.findById(dto.id()).ifPresent(table -> {
            if (dto.planX() != null) table.setPlanX(dto.planX());
            if (dto.planY() != null) table.setPlanY(dto.planY());
            table.setPlanRotation(dto.planRotation() != null ? dto.planRotation() : 0.0);
            if (dto.planForme() != null) table.setPlanForme(dto.planForme());
            if (dto.planWidth() != null) table.setPlanWidth(dto.planWidth());
            if (dto.planHeight() != null) table.setPlanHeight(dto.planHeight());
            TableEntity saved = tableRepository.save(table);
            notifyTableUpdated(saved);
        });
    }

    @Transactional
    public TableEntity transfererCommandes(Long sourceId, Long targetId) {
        TableEntity source = tableRepository.findById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + sourceId));
        TableEntity target = tableRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException(TABLE_NOT_FOUND_MSG + targetId));

        List<Commande> commandesSource = commandeRepository.findByTable(source);
        List<Commande> commandesActives = commandesSource.stream()
                .filter(c -> c.getStatut() != CommandeStatut.REGLEE && c.getStatut() != CommandeStatut.ANNULEE)
                .toList();

        if (commandesActives.isEmpty()) {
            throw new BusinessException("No active orders to transfer from table " + source.getNumero());
        }

        for (Commande c : commandesActives) {
            c.setTable(target);
            c.setUpdatedAt(timeService.now());
            commandeRepository.save(c);
        }

        target.setOccupee(true);
        if (target.getDateOccupation() == null) {
            target.setDateOccupation(LocalDateTime.now(timeService.getZoneId()));
        }
        TableEntity savedTarget = tableRepository.save(target);
        notifyTableUpdated(savedTarget);

        boolean sourceEncoreActive = commandeRepository.findByTable(source).stream()
                .anyMatch(c -> c.getStatut() != CommandeStatut.REGLEE && c.getStatut() != CommandeStatut.ANNULEE);

        if (!sourceEncoreActive) {
            source.setOccupee(false);
            source.setServeurId(null);
            source.setDateOccupation(null);
            source.setDateLiberation(LocalDateTime.now(timeService.getZoneId()));
            TableEntity savedSource = tableRepository.save(source);
            notifyTableUpdated(savedSource);
        }

        auditLogService.logAction(null, "TRANSFERT_TABLE", "TableEntity", sourceId,
                "Transfer orders from table " + source.getNumero() + " to table " + target.getNumero(), null);

        return target;
    }

    private void notifyTableUpdated(TableEntity table) {
        if (messagingTemplate != null && table != null) {
            try {
                messagingTemplate.convertAndSend("/topic/tables", TableResponseDTO.from(table));
            } catch (Exception _) {
                // Safe handling of WebSocket delivery
            }
        }
    }

    private void notifyTableDeleted(Long id) {
        if (messagingTemplate != null && id != null) {
            try {
                messagingTemplate.convertAndSend("/topic/tables/supprime", id);
            } catch (Exception _) {
                // Safe handling of WebSocket delivery
            }
        }
    }
}