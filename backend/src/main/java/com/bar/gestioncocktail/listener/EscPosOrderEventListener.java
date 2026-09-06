package com.bar.gestioncocktail.listener;

import com.bar.gestioncocktail.event.InvoiceSettledEvent;
import com.bar.gestioncocktail.event.OrderCreatedEvent;
import com.bar.gestioncocktail.model.AppSettings;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.printing.EscPosPrintingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Asynchronous Spring domain event listener that triggers direct ESC/POS network ticket printing
 * to bar and kitchen workstation printers upon order creation, and handles cash drawer / receipt
 * actions upon invoice settlement.
 */
@Component
public class EscPosOrderEventListener {

    private static final Logger log = LoggerFactory.getLogger(EscPosOrderEventListener.class);

    private final EscPosPrintingService printingService;
    private final AppSettingsService appSettingsService;

    /**
     * Constructs the event listener with the ESC/POS printing service and application settings service.
     *
     * @param printingService Printing orchestrator service
     * @param appSettingsService Application settings service
     */
    public EscPosOrderEventListener(EscPosPrintingService printingService, AppSettingsService appSettingsService) {
        this.printingService = printingService;
        this.appSettingsService = appSettingsService;
    }

    /**
     * Automatically dispatches tickets to bar and kitchen thermal printers when a new order is placed,
     * provided that direct printing is enabled in the establishment settings.
     *
     * @param event Order creation domain event
     */
    @Async("openbarAsyncExecutor")
    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        if (event == null || event.commande() == null || event.commande().getId() == null) {
            return;
        }

        try {
            AppSettings settings = appSettingsService.getSettings();
            if (Boolean.TRUE.equals(settings.getDirectPrintingEnabled())) {
                log.info("Auto-dispatching order #{} to ESC/POS network printers", event.commande().getId());
                printingService.dispatchOrder(event.commande().getId());
            }
        } catch (Exception ex) {
            log.warn("Failed to auto-dispatch order #{} to ESC/POS printers: {}", event.commande().getId(), ex.getMessage());
        }
    }

    /**
     * Automatically triggers receipt printing and/or cash drawer kicking when an invoice is settled,
     * provided that direct printing is enabled in the establishment settings.
     *
     * @param event Invoice settlement domain event
     */
    @Async("openbarAsyncExecutor")
    @EventListener
    public void onInvoiceSettled(InvoiceSettledEvent event) {
        if (event == null || event.facture() == null || event.facture().getId() == null) {
            return;
        }

        try {
            AppSettings settings = appSettingsService.getSettings();
            if (Boolean.TRUE.equals(settings.getDirectPrintingEnabled())
                    && settings.getCashDeskPrinterIp() != null
                    && !settings.getCashDeskPrinterIp().isBlank()) {
                log.info("Auto-printing receipt and opening cash drawer for settled invoice #{}", event.facture().getId());
                printingService.printInvoiceReceipt(event.facture().getId(), true);
            }
        } catch (Exception ex) {
            log.warn("Failed to process settled invoice #{} for ESC/POS printing: {}", event.facture().getId(), ex.getMessage());
        }
    }
}
