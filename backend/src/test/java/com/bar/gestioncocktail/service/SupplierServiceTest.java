package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.SupplierCreateRequest;
import com.bar.gestioncocktail.dto.SupplierDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.EstablishmentModule;
import com.bar.gestioncocktail.model.Ingredient;
import com.bar.gestioncocktail.model.Supplier;
import com.bar.gestioncocktail.repository.IngredientRepository;
import com.bar.gestioncocktail.repository.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link SupplierService}.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierService Unit Tests")
class SupplierServiceTest {

    @Mock
    private SupplierRepository supplierRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @InjectMocks
    private SupplierService supplierService;

    private Supplier sampleSupplier;

    @BeforeEach
    void setUp() {
        sampleSupplier = new Supplier();
        sampleSupplier.setId(1L);
        sampleSupplier.setNom("Brasserie du Mont-Blanc");
        sampleSupplier.setContactNom("Sylvain Favre");
        sampleSupplier.setEmail("contact@montblanc.fr");
        sampleSupplier.setTelephone("+33 4 50 00 00 00");
        sampleSupplier.setAdresse("125 Rue des Brasseurs, 74000 Annecy");
        sampleSupplier.setConditionsPaiement("30 days net");
        sampleSupplier.setNotes("Leading craft beer brewery");
        sampleSupplier.setActif(true);
    }

    @Nested
    @DisplayName("Query Suppliers")
    class QuerySuppliersTests {

        @Test
        @DisplayName("Should retrieve all suppliers ordered by name")
        void shouldRetrieveAllSuppliersOrderedByName() {
            when(supplierRepository.findAllByOrderByNomAsc()).thenReturn(List.of(sampleSupplier));

            List<SupplierDTO> results = supplierService.getAllSuppliers();

            assertThat(results).hasSize(1);
            assertThat(results.getFirst().nom()).isEqualTo("Brasserie du Mont-Blanc");
            verify(establishmentConfigService).checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
            verify(supplierRepository).findAllByOrderByNomAsc();
        }

        @Test
        @DisplayName("Should retrieve only active suppliers")
        void shouldRetrieveOnlyActiveSuppliers() {
            when(supplierRepository.findByActifTrueOrderByNomAsc()).thenReturn(List.of(sampleSupplier));

            List<SupplierDTO> results = supplierService.getActiveSuppliers();

            assertThat(results).hasSize(1);
            assertThat(results.getFirst().actif()).isTrue();
            verify(establishmentConfigService).checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
            verify(supplierRepository).findByActifTrueOrderByNomAsc();
        }

        @Test
        @DisplayName("Should retrieve single supplier by ID when present")
        void shouldRetrieveSupplierByIdWhenPresent() {
            when(supplierRepository.findById(1L)).thenReturn(Optional.of(sampleSupplier));

            SupplierDTO result = supplierService.getSupplierById(1L);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo(1L);
            assertThat(result.nom()).isEqualTo("Brasserie du Mont-Blanc");
            verify(establishmentConfigService).checkModuleEnabled(EstablishmentModule.SUPPLIERS_MANAGEMENT);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when supplier ID does not exist")
        void shouldThrowResourceNotFoundExceptionWhenSupplierNotFound() {
            when(supplierRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> supplierService.getSupplierById(99L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Supplier not found with ID: 99");
        }
    }

    @Nested
    @DisplayName("Create Supplier")
    class CreateSupplierTests {

        @Test
        @DisplayName("Should create supplier successfully when request is valid")
        void shouldCreateSupplierSuccessfully() {
            SupplierCreateRequest request = new SupplierCreateRequest(
                    "Distillerie des Alpes",
                    "Marc Veyrat",
                    "marc@alpes.fr",
                    "+33 4 79 00 00 00",
                    "48 Chemin des Alambics",
                    "30 days net",
                    "Spirits and liqueurs",
                    true
            );

            when(supplierRepository.save(any(Supplier.class))).thenAnswer(invocation -> {
                Supplier s = invocation.getArgument(0);
                s.setId(2L);
                return s;
            });

            SupplierDTO created = supplierService.createSupplier(request);

            assertThat(created).isNotNull();
            assertThat(created.id()).isEqualTo(2L);
            assertThat(created.nom()).isEqualTo("Distillerie des Alpes");
            assertThat(created.conditionsPaiement()).isEqualTo("30 days net");
            verify(supplierRepository).save(any(Supplier.class));
        }

        @Test
        @DisplayName("Should throw BusinessException when supplier name is blank")
        void shouldThrowBusinessExceptionWhenSupplierNameBlank() {
            SupplierCreateRequest request = new SupplierCreateRequest(
                    "   ", null, null, null, null, null, null, true
            );

            assertThatThrownBy(() -> supplierService.createSupplier(request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Supplier company name cannot be blank");

            verify(supplierRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Update Supplier")
    class UpdateSupplierTests {

        @Test
        @DisplayName("Should update supplier attributes successfully")
        void shouldUpdateSupplierSuccessfully() {
            SupplierCreateRequest request = new SupplierCreateRequest(
                    "Brasserie du Mont-Blanc SAS",
                    "Nouveau Contact",
                    "nouveau@montblanc.fr",
                    "+33 4 50 11 22 33",
                    "130 Rue des Brasseurs, 74000 Annecy",
                    "45 days net",
                    "Updated notes",
                    true
            );

            when(supplierRepository.findById(1L)).thenReturn(Optional.of(sampleSupplier));
            when(supplierRepository.save(any(Supplier.class))).thenAnswer(invocation -> invocation.getArgument(0));

            SupplierDTO updated = supplierService.updateSupplier(1L, request);

            assertThat(updated.nom()).isEqualTo("Brasserie du Mont-Blanc SAS");
            assertThat(updated.contactNom()).isEqualTo("Nouveau Contact");
            assertThat(updated.conditionsPaiement()).isEqualTo("45 days net");
            assertThat(updated.notes()).isEqualTo("Updated notes");
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when updating non-existent supplier")
        void shouldThrowResourceNotFoundExceptionWhenUpdatingNonExistentSupplier() {
            SupplierCreateRequest request = new SupplierCreateRequest("Any", null, null, null, null, null, null, true);
            when(supplierRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> supplierService.updateSupplier(999L, request))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Supplier not found with ID: 999");
        }
    }

    @Nested
    @DisplayName("Delete Supplier")
    class DeleteSupplierTests {

        @Test
        @DisplayName("Should soft-delete supplier by setting active flag to false")
        void shouldSoftDeleteSupplier() {
            when(supplierRepository.findById(1L)).thenReturn(Optional.of(sampleSupplier));
            when(supplierRepository.save(any(Supplier.class))).thenAnswer(invocation -> invocation.getArgument(0));

            supplierService.deleteSupplier(1L);

            assertThat(sampleSupplier.getActif()).isFalse();
            verify(supplierRepository).save(sampleSupplier);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when deleting non-existent supplier")
        void shouldThrowResourceNotFoundExceptionWhenDeletingNonExistentSupplier() {
            when(supplierRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> supplierService.deleteSupplier(999L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Supplier not found with ID: 999");

            verify(supplierRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Legacy Free-Text Supplier Migration")
    class MigrationTests {

        @Test
        @DisplayName("Should do nothing when no ingredients have legacy free-text supplier string")
        void shouldDoNothingWhenNoLegacySuppliersFound() {
            Ingredient ing = new Ingredient();
            ing.setId(10L);
            ing.setFournisseur(null);
            when(ingredientRepository.findAll()).thenReturn(List.of(ing));

            supplierService.migrateLegacyFournisseurNames();

            verify(supplierRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should link existing supplier entity when legacy supplier name matches")
        void shouldLinkExistingSupplierEntity() {
            Ingredient ing = new Ingredient();
            ing.setId(101L);
            ing.setFournisseur("Distillerie des Alpes");
            ing.setDefaultSupplier(null);

            when(ingredientRepository.findAll()).thenReturn(List.of(ing));
            when(supplierRepository.findByNomIgnoreCase("Distillerie des Alpes")).thenReturn(Optional.of(sampleSupplier));

            supplierService.migrateLegacyFournisseurNames();

            assertThat(ing.getDefaultSupplier()).isEqualTo(sampleSupplier);
            verify(ingredientRepository).save(ing);
        }

        @Test
        @DisplayName("Should create new supplier entity when legacy supplier name does not exist yet")
        void shouldCreateSupplierEntityWhenNotExists() {
            Ingredient ing = new Ingredient();
            ing.setId(102L);
            ing.setFournisseur("Nouveau Brasseur");
            ing.setDefaultSupplier(null);

            Supplier newSup = new Supplier("Nouveau Brasseur");
            when(ingredientRepository.findAll()).thenReturn(List.of(ing));
            when(supplierRepository.findByNomIgnoreCase("Nouveau Brasseur")).thenReturn(Optional.empty());
            when(supplierRepository.save(any(Supplier.class))).thenReturn(newSup);

            supplierService.migrateLegacyFournisseurNames();

            assertThat(ing.getDefaultSupplier()).isEqualTo(newSup);
            verify(ingredientRepository).save(ing);
        }
    }
}
