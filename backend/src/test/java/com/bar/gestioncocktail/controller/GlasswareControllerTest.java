package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.GlasswareRequestDTO;
import com.bar.gestioncocktail.dto.GlasswareResponseDTO;
import com.bar.gestioncocktail.service.GlasswareService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GlasswareControllerTest {

    @Mock
    private GlasswareService glasswareService;

    @InjectMocks
    private GlasswareController glasswareController;

    private GlasswareResponseDTO glassDto;

    @BeforeEach
    void setUp() {
        glassDto = new GlasswareResponseDTO(
            1L, "Verre Tumbler", new BigDecimal("35.0"), "assets/images/verres/verre_tumbler.png",
            "Long drink glass", true, LocalDateTime.now(), LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("getAll - retrieves list of all glassware")
    void getAll_success() {
        when(glasswareService.getAll()).thenReturn(List.of(glassDto));

        ResponseEntity<List<GlasswareResponseDTO>> response = glasswareController.getAll();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).nom()).isEqualTo("Verre Tumbler");
    }

    @Test
    @DisplayName("getById - retrieves glassware by ID")
    void getById_success() {
        when(glasswareService.getById(1L)).thenReturn(glassDto);

        ResponseEntity<GlasswareResponseDTO> response = glasswareController.getById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().nom()).isEqualTo("Verre Tumbler");
    }

    @Test
    @DisplayName("create - creates new glassware with 201 status")
    void create_success() {
        GlasswareRequestDTO request = new GlasswareRequestDTO(
            "Verre Shot", new BigDecimal("5.0"), "assets/images/verres/verre_tumbler.png", "Shooter", false
        );
        when(glasswareService.create(request)).thenReturn(glassDto);

        ResponseEntity<GlasswareResponseDTO> response = glasswareController.create(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    @DisplayName("update - updates existing glassware")
    void update_success() {
        GlasswareRequestDTO request = new GlasswareRequestDTO(
            "Verre Tumbler XL", new BigDecimal("40.0"), "assets/images/verres/verre_tumbler.png", "Bigger tumbler", false
        );
        when(glasswareService.update(1L, request)).thenReturn(glassDto);

        ResponseEntity<GlasswareResponseDTO> response = glasswareController.update(1L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("uploadGlasswarePhoto - uploads glassware photo and returns updated DTO")
    void uploadGlasswarePhoto_success() {
        MultipartFile mockFile = mock(MultipartFile.class);
        when(glasswareService.updateGlasswareImage(1L, mockFile)).thenReturn(glassDto);

        ResponseEntity<GlasswareResponseDTO> response = glasswareController.uploadGlasswarePhoto(1L, mockFile);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        verify(glasswareService).updateGlasswareImage(1L, mockFile);
    }

    @Test
    @DisplayName("delete - deletes glassware with 204 status")
    void delete_success() {
        ResponseEntity<Void> response = glasswareController.delete(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(glasswareService).delete(1L);
    }
}
