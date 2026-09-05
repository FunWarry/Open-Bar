package com.bar.gestioncocktail.listener;

import com.bar.gestioncocktail.event.InvoiceSettledEvent;
import com.bar.gestioncocktail.event.OrderCreatedEvent;
import com.bar.gestioncocktail.event.TableLiberatedEvent;
import com.bar.gestioncocktail.event.TableUpdatedEvent;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.TableRepository;
import com.bar.gestioncocktail.service.TimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Domain event listener managing table state transitions triggered by orders and billing events.
 */
@Component
public class TableEventListener {

    private static final Logger log = LoggerFactory.getLogger(TableEventListener.class);

    private final TableRepository tableRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TimeService timeService;

    public TableEventListener(
            TableRepository tableRepository,
            ApplicationEventPublisher eventPublisher,
            TimeService timeService) {
        this.tableRepository = tableRepository;
        this.eventPublisher = eventPublisher;
        this.timeService = timeService;
    }

    /**
     * Synchronizes table occupancy when an order is created.
     *
     * @param event The order created domain event
     */
    @EventListener
    @Transactional
    public void onOrderCreated(OrderCreatedEvent event) {
        if (event == null || event.commande() == null || event.commande().getTable() == null) {
            return;
        }
        Long tableId = event.commande().getTable().getId();
        if (tableId == null) {
            return;
        }

        tableRepository.findById(tableId).ifPresent(table -> {
            if (!table.isOccupee()) {
                table.setOccupee(true);
                if (event.commande().getServeur() != null) {
                    table.setServeurId(event.commande().getServeur().getId());
                }
                table.setDateOccupation(timeService.now());
                TableEntity savedTable = tableRepository.save(table);
                log.info("Table #{} marked occupied following order creation #{}", table.getNumero(), event.commande().getId());
                eventPublisher.publishEvent(new TableUpdatedEvent(savedTable));
            }
        });
    }

    /**
     * Synchronizes table liberation when an invoice is settled and table release is requested.
     *
     * @param event The invoice settled domain event
     */
    @EventListener
    @Transactional
    public void onInvoiceSettled(InvoiceSettledEvent event) {
        if (event == null || !event.tableLiberated() || event.table() == null || event.table().getId() == null) {
            return;
        }

        tableRepository.findById(event.table().getId()).ifPresent(table -> {
            table.setOccupee(false);
            table.setServeurId(null);
            table.setDateOccupation(null);
            table.setDateLiberation(timeService.now());
            TableEntity savedTable = tableRepository.save(table);
            log.info("Table #{} liberated following invoice settlement #{}", table.getNumero(),
                    event.facture() != null ? event.facture().getId() : null);
            eventPublisher.publishEvent(new TableLiberatedEvent(savedTable));
        });
    }
}
