package com.bar.gestioncocktail.service.printing;

import com.bar.gestioncocktail.dto.PrintResultDTO;
import com.bar.gestioncocktail.dto.PrinterStatusDTO;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.FactureRepository;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Core business service orchestrating direct network socket printing (TCP port 9100)
 * for order tickets, customer receipts, test patterns, and cash drawer pulses.
 */
@Service
@Transactional(readOnly = true)
public class EscPosPrintingService {

    private static final Logger log = LoggerFactory.getLogger(EscPosPrintingService.class);
    private static final int DEFAULT_TIMEOUT_MS = 2500;
    private static final String CASH_DESK_IP_NOT_CONFIGURED = "Cash desk printer IP is not configured";

    private final AppSettingsService appSettingsService;
    private final EstablishmentConfigService establishmentConfigService;
    private final CommandeRepository commandeRepository;
    private final FactureRepository factureRepository;
    private final com.bar.gestioncocktail.repository.DailyCashClosureRepository dailyCashClosureRepository;
    private final EscPosFormatter escPosFormatter;
    private final EscPosSocketClient socketClient;

    /**
     * Constructs the printing service with required repositories, configuration, formatter, and socket client.
     *
     * @param appSettingsService Application settings service
     * @param establishmentConfigService Legal establishment configuration service
     * @param commandeRepository Order repository
     * @param factureRepository Invoice repository
     * @param dailyCashClosureRepository Daily cash register closure repository
     * @param escPosFormatter ESC/POS binary command stream formatter
     * @param socketClient TCP raw socket client
     */
    public EscPosPrintingService(
            AppSettingsService appSettingsService,
            EstablishmentConfigService establishmentConfigService,
            CommandeRepository commandeRepository,
            FactureRepository factureRepository,
            com.bar.gestioncocktail.repository.DailyCashClosureRepository dailyCashClosureRepository,
            EscPosFormatter escPosFormatter,
            EscPosSocketClient socketClient) {
        this.appSettingsService = appSettingsService;
        this.establishmentConfigService = establishmentConfigService;
        this.commandeRepository = commandeRepository;
        this.factureRepository = factureRepository;
        this.dailyCashClosureRepository = dailyCashClosureRepository;
        this.escPosFormatter = escPosFormatter;
        this.socketClient = socketClient;
    }

    /**
     * Returns current LAN printer configuration and activation status.
     *
     * @return Status DTO
     */
    public PrinterStatusDTO getPrinterStatus() {
        AppSettings settings = appSettingsService.getSettings();
        return new PrinterStatusDTO(
                Boolean.TRUE.equals(settings.getDirectPrintingEnabled()),
                settings.getBarPrinterIp(),
                settings.getKitchenPrinterIp(),
                settings.getCashDeskPrinterIp(),
                settings.getPrinterPort() != null ? settings.getPrinterPort() : 9100
        );
    }

    /**
     * Dispatches a diagnostic test ticket to the configured printer for a specific role.
     *
     * @param role Target printer role (BAR, KITCHEN, CASH_DESK)
     * @return Execution result report
     */
    public PrintResultDTO printTestTicket(PrinterRole role) {
        AppSettings settings = appSettingsService.getSettings();
        int port = settings.getPrinterPort() != null ? settings.getPrinterPort() : 9100;
        String ip = resolveIpForRole(settings, role);

        if (ip == null || ip.isBlank()) {
            return new PrintResultDTO(
                    false,
                    role != null ? role.name() : "UNKNOWN",
                    null,
                    port,
                    "Printer IP address is not configured for role " + role,
                    0
            );
        }
        return testConnection(ip, port, role);
    }

    /**
     * Tests a raw TCP connection to any arbitrary IP address and port by sending a test ticket.
     *
     * @param ip Target LAN IP address
     * @param port Target TCP raw printer port
     * @param role Printer role simulation
     * @return Execution result report
     */
    public PrintResultDTO testConnection(String ip, int port, PrinterRole role) {
        AppSettings settings = appSettingsService.getSettings();
        byte[] data = escPosFormatter.formatTestTicket(
                role != null ? role : PrinterRole.BAR,
                settings.getEstablishmentName(),
                ip,
                port
        );
        return sendSafely(ip, port, data, role != null ? role : PrinterRole.BAR);
    }

    /**
     * Dispatches preparation workstation tickets for a specific order.
     * Routes bar items to the bar printer and kitchen/snack items to the kitchen printer.
     *
     * @param commandeId Identifier of the order
     * @return List of dispatch results per targeted workstation
     */
    public List<PrintResultDTO> dispatchOrder(Long commandeId) {
        Commande commande = commandeRepository.findById(commandeId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + commandeId));

        AppSettings settings = appSettingsService.getSettings();
        int port = settings.getPrinterPort() != null ? settings.getPrinterPort() : 9100;
        if (!Boolean.TRUE.equals(settings.getDirectPrintingEnabled())) {
            return List.of(new PrintResultDTO(false, "SYSTEM", null, port, "Direct printing is disabled in settings", 0));
        }

        List<PrintResultDTO> results = new ArrayList<>();
        List<CommandeItem> allItems = commande.getItems() != null ? commande.getItems() : List.of();

        List<CommandeItem> barItems = allItems.stream()
                .filter(item -> resolveStation(item) == PreparationStation.BAR)
                .toList();

        List<CommandeItem> kitchenItems = allItems.stream()
                .filter(item -> {
                    PreparationStation st = resolveStation(item);
                    return st == PreparationStation.KITCHEN || st == PreparationStation.SNACK;
                })
                .toList();

        if (!barItems.isEmpty()) {
            String barIp = settings.getBarPrinterIp();
            if (barIp != null && !barIp.isBlank()) {
                byte[] data = escPosFormatter.formatOrderTicket(commande, barItems, PreparationStation.BAR, settings.getEstablishmentName());
                results.add(sendSafely(barIp, port, data, PrinterRole.BAR));
            } else {
                results.add(new PrintResultDTO(false, PrinterRole.BAR.name(), null, port, "Bar printer IP is not configured", 0));
            }
        }

        if (!kitchenItems.isEmpty()) {
            String kitchenIp = settings.getKitchenPrinterIp();
            if (kitchenIp != null && !kitchenIp.isBlank()) {
                byte[] data = escPosFormatter.formatOrderTicket(commande, kitchenItems, PreparationStation.KITCHEN, settings.getEstablishmentName());
                results.add(sendSafely(kitchenIp, port, data, PrinterRole.KITCHEN));
            } else {
                results.add(new PrintResultDTO(false, PrinterRole.KITCHEN.name(), null, port, "Kitchen printer IP is not configured", 0));
            }
        }

        return results;
    }

    private PreparationStation resolveStation(CommandeItem item) {
        if (item.getStation() != null) {
            return item.getStation();
        }
        if (item.getCocktail() != null && item.getCocktail().getStation() != null) {
            return item.getCocktail().getStation();
        }
        return PreparationStation.BAR;
    }

    /**
     * Prints a formal invoice receipt on the cash desk printer, optionally pulsing the cash drawer.
     *
     * @param factureId Identifier of the invoice
     * @param openCashDrawer Whether to trigger cash drawer kick pulse
     * @return Execution result report
     */
    public PrintResultDTO printInvoiceReceipt(Long factureId, boolean openCashDrawer) {
        Facture facture = factureRepository.findById(factureId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with ID: " + factureId));

        AppSettings settings = appSettingsService.getSettings();
        int port = settings.getPrinterPort() != null ? settings.getPrinterPort() : 9100;
        String cashDeskIp = settings.getCashDeskPrinterIp();

        if (cashDeskIp == null || cashDeskIp.isBlank()) {
            return new PrintResultDTO(false, PrinterRole.CASH_DESK.name(), null, port, CASH_DESK_IP_NOT_CONFIGURED, 0);
        }

        EstablishmentConfig legalConfig = establishmentConfigService.getConfig();
        byte[] data = escPosFormatter.formatInvoiceReceipt(facture, legalConfig, settings, openCashDrawer);
        return sendSafely(cashDeskIp, port, data, PrinterRole.CASH_DESK);
    }

    /**
     * Prints an official Z-report register closure ticket on the cash desk printer.
     *
     * @param closureId Identifier of the daily cash closure
     * @return Execution result report
     */
    public PrintResultDTO printZReportTicket(Long closureId) {
        DailyCashClosure closure = dailyCashClosureRepository.findById(closureId)
                .orElseThrow(() -> new ResourceNotFoundException("Daily cash closure not found with ID: " + closureId));

        AppSettings settings = appSettingsService.getSettings();
        int port = settings.getPrinterPort() != null ? settings.getPrinterPort() : 9100;
        String cashDeskIp = settings.getCashDeskPrinterIp();

        if (cashDeskIp == null || cashDeskIp.isBlank()) {
            return new PrintResultDTO(false, PrinterRole.CASH_DESK.name(), null, port, CASH_DESK_IP_NOT_CONFIGURED, 0);
        }

        EstablishmentConfig legalConfig = establishmentConfigService.getConfig();
        byte[] data = escPosFormatter.formatZReportTicket(closure, legalConfig, settings);
        return sendSafely(cashDeskIp, port, data, PrinterRole.CASH_DESK);
    }

    /**
     * Sends an ESC p pulse command to the cash desk printer to trigger cash drawer opening.
     *
     * @return Execution result report
     */
    public PrintResultDTO openCashDrawer() {
        AppSettings settings = appSettingsService.getSettings();
        int port = settings.getPrinterPort() != null ? settings.getPrinterPort() : 9100;
        String cashDeskIp = settings.getCashDeskPrinterIp();

        if (cashDeskIp == null || cashDeskIp.isBlank()) {
            return new PrintResultDTO(false, PrinterRole.CASH_DESK.name(), null, port, CASH_DESK_IP_NOT_CONFIGURED, 0);
        }

        byte[] data = escPosFormatter.formatCashDrawerKick();
        return sendSafely(cashDeskIp, port, data, PrinterRole.CASH_DESK);
    }

    private String resolveIpForRole(AppSettings settings, PrinterRole role) {
        if (role == null) return null;
        return switch (role) {
            case BAR -> settings.getBarPrinterIp();
            case KITCHEN -> settings.getKitchenPrinterIp();
            case CASH_DESK -> settings.getCashDeskPrinterIp();
        };
    }

    private PrintResultDTO sendSafely(String ip, int port, byte[] data, PrinterRole role) {
        long start = System.currentTimeMillis();
        try {
            socketClient.send(ip, port, data, DEFAULT_TIMEOUT_MS);
            long duration = System.currentTimeMillis() - start;
            return new PrintResultDTO(true, role.name(), ip, port, "Print job dispatched successfully", duration);
        } catch (Exception ex) {
            long duration = System.currentTimeMillis() - start;
            log.warn("Failed to transmit ESC/POS data to {} printer at {}:{}: {}", role, ip, port, ex.getMessage());
            return new PrintResultDTO(false, role.name(), ip, port, "Printer offline or unreachable: " + ex.getMessage(), duration);
        }
    }
}
