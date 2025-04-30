package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.TableZone;
import com.bar.gestioncocktail.service.TableService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tables")
public class TableController {

    @Autowired
    private TableService tableService;

    @GetMapping
    public List<TableEntity> getAllTables() {
        return tableService.getAllTables();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TableEntity> getTableById(@PathVariable Long id) {
        return tableService.getTableById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/zone/{zone}")
    public List<TableEntity> getTablesByZone(@PathVariable TableZone zone) {
        return tableService.getTablesByZone(zone);
    }

    @GetMapping("/occupee/{occupee}")
    public List<TableEntity> getTablesByOccupee(@PathVariable boolean occupee) {
        return tableService.getTablesByOccupee(occupee);
    }

    @GetMapping("/serveur/{serveurId}")
    public List<TableEntity> getTablesByServeurId(@PathVariable Long serveurId) {
        return tableService.getTablesByServeurId(serveurId);
    }

    @PostMapping
    public TableEntity createTable(@RequestBody TableEntity table) {
        return tableService.createTable(table);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TableEntity> updateTable(@PathVariable Long id, @RequestBody TableEntity tableDetails) {
        try {
            TableEntity updatedTable = tableService.updateTable(id, tableDetails);
            return ResponseEntity.ok(updatedTable);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTable(@PathVariable Long id) {
        tableService.deleteTable(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/occuper")
    public ResponseEntity<TableEntity> occuperTable(@PathVariable Long id, @RequestParam Long serveurId) {
        try {
            TableEntity table = tableService.occuperTable(id, serveurId);
            return ResponseEntity.ok(table);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/liberer")
    public ResponseEntity<TableEntity> libererTable(@PathVariable Long id) {
        try {
            TableEntity table = tableService.libererTable(id);
            return ResponseEntity.ok(table);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
} 