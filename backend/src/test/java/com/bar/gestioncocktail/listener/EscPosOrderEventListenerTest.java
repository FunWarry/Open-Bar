package com.bar.gestioncocktail.listener;

import com.bar.gestioncocktail.event.InvoiceSettledEvent;
import com.bar.gestioncocktail.event.OrderCreatedEvent;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.Facture;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.printing.EscPosPrintingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EscPosOrderEventListenerTest {

    @Mock
    private EscPosPrintingService printingService;

    @Mock
    private AppSettingsService appSettingsService;

    @InjectMocks
    private EscPosOrderEventListener listener;

    private AppSettings settings;

    @BeforeEach
    void setUp() {
        settings = new AppSettings();
        settings.setDirectPrintingEnabled(true);
        settings.setCashDeskPrinterIp("192.168.1.103");
    }

    @Test
    @DisplayName("onOrderCreated delegates to printingService.dispatchOrder when enabled")
    void onOrderCreated_triggersDispatch() {
        when(appSettingsService.getSettings()).thenReturn(settings);

        Commande commande = new Commande();
        commande.setId(123L);
        OrderCreatedEvent event = new OrderCreatedEvent(commande);

        listener.onOrderCreated(event);

        verify(printingService).dispatchOrder(123L);
    }

    @Test
    @DisplayName("onOrderCreated does not dispatch when direct printing disabled")
    void onOrderCreated_whenDisabled_doesNotDispatch() {
        settings.setDirectPrintingEnabled(false);
        when(appSettingsService.getSettings()).thenReturn(settings);

        Commande commande = new Commande();
        commande.setId(123L);
        OrderCreatedEvent event = new OrderCreatedEvent(commande);

        listener.onOrderCreated(event);

        verifyNoInteractions(printingService);
    }

    @Test
    @DisplayName("onInvoiceSettled delegates to printingService.printInvoiceReceipt when enabled")
    void onInvoiceSettled_triggersReceiptPrinting() {
        when(appSettingsService.getSettings()).thenReturn(settings);

        Facture facture = new Facture();
        facture.setId(456L);
        InvoiceSettledEvent event = new InvoiceSettledEvent(facture, null, List.of(), false);

        listener.onInvoiceSettled(event);

        verify(printingService).printInvoiceReceipt(456L, true);
    }
}
