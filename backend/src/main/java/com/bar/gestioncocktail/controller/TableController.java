package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PlanSalleDTO;
import com.bar.gestioncocktail.dto.TablePositionDTO;
import com.bar.gestioncocktail.dto.TableResponseDTO;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.TableZone;
import com.bar.gestioncocktail.service.TableService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
public class TableController {

    private final TableService tableService;

    public TableController(TableService tableService) {
        this.tableService = tableService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<TableResponseDTO> getAllTables() {
        return tableService.getAllTables().stream().map(TableResponseDTO::from).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TableResponseDTO> getTableById(@PathVariable Long id) {
        return tableService.getTableById(id)
            .map(TableResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/zone/{zone}")
    @PreAuthorize("isAuthenticated()")
    public List<TableResponseDTO> getTablesByZone(@PathVariable TableZone zone) {
        return tableService.getTablesByZone(zone).stream().map(TableResponseDTO::from).toList();
    }

    @GetMapping("/occupee/{occupee}")
    @PreAuthorize("isAuthenticated()")
    public List<TableResponseDTO> getTablesByOccupee(@PathVariable boolean occupee) {
        return tableService.getTablesByOccupee(occupee).stream().map(TableResponseDTO::from).toList();
    }

    @GetMapping("/serveur/{serveurId}")
    @PreAuthorize("isAuthenticated()")
    public List<TableResponseDTO> getTablesByServeurId(@PathVariable Long serveurId) {
        return tableService.getTablesByServeurId(serveurId).stream().map(TableResponseDTO::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public TableResponseDTO createTable(@Valid @RequestBody TableEntity table) {
        return TableResponseDTO.from(tableService.createTable(table));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<TableResponseDTO> updateTable(@PathVariable Long id, @Valid @RequestBody TableEntity tableDetails) {
        return ResponseEntity.ok(TableResponseDTO.from(tableService.updateTable(id, tableDetails)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Void> deleteTable(@PathVariable Long id) {
        tableService.deleteTable(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/occuper")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<TableResponseDTO> occuperTable(@PathVariable Long id, @RequestParam Long serveurId) {
        return ResponseEntity.ok(TableResponseDTO.from(tableService.occuperTable(id, serveurId)));
    }

    @PostMapping("/{id}/liberer")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<TableResponseDTO> libererTable(@PathVariable Long id) {
        return ResponseEntity.ok(TableResponseDTO.from(tableService.libererTable(id)));
    }

    @GetMapping("/plan")
    @PreAuthorize("isAuthenticated()")
    public List<PlanSalleDTO> getPlanSalle() {
        return tableService.getAllTablesAvecPositions()
            .stream().map(PlanSalleDTO::from).toList();
    }

    @PutMapping("/{id}/position")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<TableResponseDTO> updatePosition(
        @PathVariable Long id,
        @RequestParam Double x,
        @RequestParam Double y,
        @RequestParam(required = false) Double rotation,
        @RequestParam(required = false) String forme) {
        return ResponseEntity.ok(TableResponseDTO.from(
            tableService.updatePosition(id, x, y, rotation, forme)));
    }

    @PutMapping("/plan/positions")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Void> updatePositionsBatch(@RequestBody List<TablePositionDTO> positions) {
        tableService.updatePositionsBatch(positions);
        return ResponseEntity.ok().build();
    }
}
