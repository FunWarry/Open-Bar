package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.TableZone;
import com.bar.gestioncocktail.service.TableService;
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
    public List<TableEntity> getAllTables() {
        return tableService.getAllTables();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TableEntity> getTableById(@PathVariable Long id) {
        return tableService.getTableById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/zone/{zone}")
    @PreAuthorize("isAuthenticated()")
    public List<TableEntity> getTablesByZone(@PathVariable TableZone zone) {
        return tableService.getTablesByZone(zone);
    }

    @GetMapping("/occupee/{occupee}")
    @PreAuthorize("isAuthenticated()")
    public List<TableEntity> getTablesByOccupee(@PathVariable boolean occupee) {
        return tableService.getTablesByOccupee(occupee);
    }

    @GetMapping("/serveur/{serveurId}")
    @PreAuthorize("isAuthenticated()")
    public List<TableEntity> getTablesByServeurId(@PathVariable Long serveurId) {
        return tableService.getTablesByServeurId(serveurId);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public TableEntity createTable(@RequestBody TableEntity table) {
        return tableService.createTable(table);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<TableEntity> updateTable(@PathVariable Long id, @RequestBody TableEntity tableDetails) {
        try {
            TableEntity updatedTable = tableService.updateTable(id, tableDetails);
            return ResponseEntity.ok(updatedTable);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Void> deleteTable(@PathVariable Long id) {
        tableService.deleteTable(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/occuper")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<TableEntity> occuperTable(@PathVariable Long id, @RequestParam Long serveurId) {
        try {
            TableEntity table = tableService.occuperTable(id, serveurId);
            return ResponseEntity.ok(table);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/liberer")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<TableEntity> libererTable(@PathVariable Long id) {
        try {
            TableEntity table = tableService.libererTable(id);
            return ResponseEntity.ok(table);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
} 