package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PublicCommandeRequestDTO;
import com.bar.gestioncocktail.dto.PublicCommandeResponseDTO;
import com.bar.gestioncocktail.service.PublicCommandeService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/commandes")
public class PublicCommandeController {

    private final PublicCommandeService publicCommandeService;

    @Autowired
    public PublicCommandeController(PublicCommandeService publicCommandeService) {
        this.publicCommandeService = publicCommandeService;
    }

    @PostMapping
    public ResponseEntity<PublicCommandeResponseDTO> creerCommande(@Valid @RequestBody PublicCommandeRequestDTO requestDTO) {
        PublicCommandeResponseDTO response = publicCommandeService.creerCommandePublique(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{trackingToken}")
    public ResponseEntity<PublicCommandeResponseDTO> getCommandeParTrackingToken(@PathVariable String trackingToken) {
        PublicCommandeResponseDTO response = publicCommandeService.getCommandeParTrackingToken(trackingToken);
        return ResponseEntity.ok(response);
    }
}
