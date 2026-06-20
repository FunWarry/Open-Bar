package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.TableResponseDTO;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.TableZone;
import com.bar.gestioncocktail.service.TableService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
public class TableController {

    @Autowired
    private TableService tableService;

    @GetMapping
    public List<TableResponseDTO> getAllTables() {
        return tableService.getAllTables().stream().map(TableResponseDTO::from).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TableResponseDTO> getTableById(@PathVariable Long id) {
        return tableService.getTableById(id)
            .map(TableResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/zone/{zone}")
    public List<TableResponseDTO> getTablesByZone(@PathVariable TableZone zone) {
        return tableService.getTablesByZone(zone).stream().map(TableResponseDTO::from).toList();
    }

    @GetMapping("/occupee/{occupee}")
    public List<TableResponseDTO> getTablesByOccupee(@PathVariable boolean occupee) {
        return tableService.getTablesByOccupee(occupee).stream().map(TableResponseDTO::from).toList();
    }

    @GetMapping("/serveur/{serveurId}")
    public List<TableResponseDTO> getTablesByServeurId(@PathVariable Long serveurId) {
        return tableService.getTablesByServeurId(serveurId).stream().map(TableResponseDTO::from).toList();
    }

    @PostMapping
    public TableResponseDTO createTable(@RequestBody TableEntity table) {
        return TableResponseDTO.from(tableService.createTable(table));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TableResponseDTO> updateTable(@PathVariable Long id, @RequestBody TableEntity tableDetails) {
        try {
            return ResponseEntity.ok(TableResponseDTO.from(tableService.updateTable(id, tableDetails)));
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
    public ResponseEntity<TableResponseDTO> occuperTable(@PathVariable Long id, @RequestParam Long serveurId) {
        try {
            return ResponseEntity.ok(TableResponseDTO.from(tableService.occuperTable(id, serveurId)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/liberer")
    public ResponseEntity<TableResponseDTO> libererTable(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(TableResponseDTO.from(tableService.libererTable(id)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
