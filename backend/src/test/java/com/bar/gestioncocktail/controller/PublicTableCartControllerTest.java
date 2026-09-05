package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.*;
import com.bar.gestioncocktail.service.TableCartService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link PublicTableCartController}.
 */
@ExtendWith(MockitoExtension.class)
class PublicTableCartControllerTest {

    @Mock
    private TableCartService tableCartService;

    @InjectMocks
    private PublicTableCartController controller;

    private final LocalDateTime fixedNow = LocalDateTime.of(2026, 9, 5, 19, 0, 0);

    @Test
    @DisplayName("getCart: returns 200 with current cart state")
    void getCart_returnsCart() {
        TableCartResponseDTO cart = new TableCartResponseDTO(
                1L, "OPEN", List.of(), 0, BigDecimal.ZERO, null, null, null, fixedNow
        );
        when(tableCartService.getCart(1L)).thenReturn(cart);

        ResponseEntity<TableCartResponseDTO> response = controller.getCart(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().tableId()).isEqualTo(1L);
        assertThat(response.getBody().status()).isEqualTo("OPEN");
        verify(tableCartService).getCart(1L);
    }

    @Test
    @DisplayName("addItem: returns 200 with updated cart after adding item")
    void addItem_returnsUpdatedCart() {
        TableCartItemRequestDTO request = new TableCartItemRequestDTO();
        request.setGuestSessionId("guest-1");
        request.setGuestName("Alice");
        request.setCocktailId(10L);
        request.setQuantite(2);

        TableCartResponseDTO updatedCart = new TableCartResponseDTO(
                1L, "OPEN", List.of(), 2, BigDecimal.valueOf(18.00), null, null, null, fixedNow
        );
        when(tableCartService.addItem(1L, request)).thenReturn(updatedCart);

        ResponseEntity<TableCartResponseDTO> response = controller.addItem(1L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalItems()).isEqualTo(2);
        verify(tableCartService).addItem(1L, request);
    }

    @Test
    @DisplayName("updateItem: returns 200 with updated cart after modifying quantity")
    void updateItem_returnsUpdatedCart() {
        TableCartItemUpdateRequestDTO request = new TableCartItemUpdateRequestDTO();
        request.setGuestSessionId("guest-1");
        request.setQuantite(3);
        request.setNotes("Extra ice");

        TableCartResponseDTO updatedCart = new TableCartResponseDTO(
                1L, "OPEN", List.of(), 3, BigDecimal.valueOf(27.00), null, null, null, fixedNow
        );
        when(tableCartService.updateItem(1L, 100L, request)).thenReturn(updatedCart);

        ResponseEntity<TableCartResponseDTO> response = controller.updateItem(1L, 100L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalItems()).isEqualTo(3);
        verify(tableCartService).updateItem(1L, 100L, request);
    }

    @Test
    @DisplayName("removeItem: returns 200 with updated cart after removing item")
    void removeItem_returnsUpdatedCart() {
        TableCartResponseDTO updatedCart = new TableCartResponseDTO(
                1L, "OPEN", List.of(), 0, BigDecimal.ZERO, null, null, null, fixedNow
        );
        when(tableCartService.removeItem(1L, 100L, "guest-1")).thenReturn(updatedCart);

        ResponseEntity<TableCartResponseDTO> response = controller.removeItem(1L, 100L, "guest-1");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalItems()).isZero();
        verify(tableCartService).removeItem(1L, 100L, "guest-1");
    }

    @Test
    @DisplayName("clearCart: returns 200 with empty cart")
    void clearCart_returnsEmptyCart() {
        TableCartResponseDTO emptyCart = new TableCartResponseDTO(
                1L, "OPEN", List.of(), 0, BigDecimal.ZERO, null, null, null, fixedNow
        );
        when(tableCartService.clearCart(1L)).thenReturn(emptyCart);

        ResponseEntity<TableCartResponseDTO> response = controller.clearCart(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().items()).isEmpty();
        verify(tableCartService).clearCart(1L);
    }

    @Test
    @DisplayName("submitCart: returns 201 with created public order DTO")
    void submitCart_returnsCreatedOrder() {
        TableCartSubmitRequestDTO request = new TableCartSubmitRequestDTO();
        request.setGuestSessionId("guest-1");
        request.setGuestName("Alice");
        request.setSessionToken("session-token-xyz");

        PublicCommandeResponseDTO createdOrder = new PublicCommandeResponseDTO();
        createdOrder.setCommandeId(42L);
        createdOrder.setTrackingToken("trk-42");

        when(tableCartService.submitCart(1L, request)).thenReturn(createdOrder);

        ResponseEntity<PublicCommandeResponseDTO> response = controller.submitCart(1L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCommandeId()).isEqualTo(42L);
        assertThat(response.getBody().getTrackingToken()).isEqualTo("trk-42");
        verify(tableCartService).submitCart(1L, request);
    }
}
