package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.GlasswareRequestDTO;
import com.bar.gestioncocktail.dto.GlasswareResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.Glassware;
import com.bar.gestioncocktail.repository.GlasswareRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GlasswareServiceTest {

    @Mock
    private GlasswareRepository glasswareRepository;

    @Mock
    private TimeService timeService;

    @Mock
    private FileUploadService fileUploadService;

    @InjectMocks
    private GlasswareService glasswareService;

    private Glassware testGlassware;
    private final LocalDateTime now = LocalDateTime.of(2026, 1, 1, 12, 0);

    @BeforeEach
    void setUp() {
        testGlassware = new Glassware();
        testGlassware.setId(1L);
        testGlassware.setNom("Verre Tumbler");
        testGlassware.setContenanceCl(new BigDecimal("35.0"));
        testGlassware.setImageUrl("assets/images/verres/verre_tumbler.png");
        testGlassware.setDescription("Long drink glass");
        testGlassware.setPredefined(true);
        testGlassware.setCreatedAt(now);
        testGlassware.setUpdatedAt(now);
    }

    @Test
    @DisplayName("Should retrieve all glassware ordered by name")
    void shouldGetAllGlassware() {
        when(glasswareRepository.findAllByOrderByNomAsc()).thenReturn(List.of(testGlassware));

        List<GlasswareResponseDTO> result = glasswareService.getAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).nom()).isEqualTo("Verre Tumbler");
        assertThat(result.get(0).contenanceCl()).isEqualByComparingTo("35.0");
    }

    @Test
    @DisplayName("Should get glassware by ID")
    void shouldGetGlasswareById() {
        when(glasswareRepository.findById(1L)).thenReturn(Optional.of(testGlassware));

        GlasswareResponseDTO result = glasswareService.getById(1L);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.nom()).isEqualTo("Verre Tumbler");
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when glassware ID does not exist")
    void shouldThrowWhenNotFound() {
        when(glasswareRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> glasswareService.getById(99L))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("99");
    }

    @Test
    @DisplayName("Should create new glassware successfully")
    void shouldCreateGlassware() {
        GlasswareRequestDTO request = new GlasswareRequestDTO(
            "Verre Shot", new BigDecimal("5.0"), "assets/images/verres/verre_tumbler.png", "Shooter glass", false
        );

        when(glasswareRepository.findByNomIgnoreCase("Verre Shot")).thenReturn(Optional.empty());
        when(timeService.now()).thenReturn(now);
        when(glasswareRepository.save(any(Glassware.class))).thenAnswer(invocation -> {
            Glassware saved = invocation.getArgument(0);
            saved.setId(2L);
            return saved;
        });

        GlasswareResponseDTO result = glasswareService.create(request);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(2L);
        assertThat(result.nom()).isEqualTo("Verre Shot");
        assertThat(result.contenanceCl()).isEqualByComparingTo("5.0");
    }

    @Test
    @DisplayName("Should throw BusinessException when creating glassware with duplicate name")
    void shouldThrowOnDuplicateName() {
        GlasswareRequestDTO request = new GlasswareRequestDTO(
            "Verre Tumbler", new BigDecimal("35.0"), null, null, false
        );

        when(glasswareRepository.findByNomIgnoreCase("Verre Tumbler")).thenReturn(Optional.of(testGlassware));

        assertThatThrownBy(() -> glasswareService.create(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("already exists");
    }

    @Test
    @DisplayName("Should upload glassware image and update URL")
    void shouldUploadGlasswareImage() {
        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        when(glasswareRepository.findById(1L)).thenReturn(Optional.of(testGlassware));
        when(fileUploadService.storeGlasswarePhoto(1L, mockFile)).thenReturn("/uploads/glassware/glassware_1_abc123.png");
        when(timeService.now()).thenReturn(now);
        when(glasswareRepository.save(any(Glassware.class))).thenAnswer(inv -> inv.getArgument(0));

        GlasswareResponseDTO result = glasswareService.updateGlasswareImage(1L, mockFile);

        assertThat(result).isNotNull();
        assertThat(result.imageUrl()).isEqualTo("/uploads/glassware/glassware_1_abc123.png");
        verify(fileUploadService).storeGlasswarePhoto(1L, mockFile);
    }

    @Test
    @DisplayName("Should delete glassware by ID")
    void shouldDeleteGlassware() {
        when(glasswareRepository.findById(1L)).thenReturn(Optional.of(testGlassware));

        glasswareService.delete(1L);

        verify(glasswareRepository).delete(testGlassware);
    }
}
