package com.bar.gestioncocktail.service.printing;

import com.bar.gestioncocktail.dto.PrintResultDTO;
import com.bar.gestioncocktail.dto.PrinterStatusDTO;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.*;
import com.bar.gestioncocktail.repository.CommandeRepository;
import com.bar.gestioncocktail.repository.FactureRepository;
import com.bar.gestioncocktail.service.AppSettingsService;
import com.bar.gestioncocktail.service.EstablishmentConfigService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EscPosPrintingServiceTest {

    @Mock
    private AppSettingsService appSettingsService;

    @Mock
    private EstablishmentConfigService establishmentConfigService;

    @Mock
    private CommandeRepository commandeRepository;

    @Mock
    private FactureRepository factureRepository;

    @Mock
    private EscPosSocketClient socketClient;

    private EscPosFormatter formatter;
    private EscPosPrintingService printingService;

    private AppSettings settings;
    private EstablishmentConfig legalConfig;

    @BeforeEach
    void setUp() {
        formatter = new EscPosFormatter();
        printingService = new EscPosPrintingService(
                appSettingsService,
                establishmentConfigService,
                commandeRepository,
                factureRepository,
                formatter,
                socketClient
        );

        settings = new AppSettings();
        settings.setDirectPrintingEnabled(true);
        settings.setPrinterPort(9100);
        settings.setBarPrinterIp("192.168.1.101");
        settings.setKitchenPrinterIp("192.168.1.102");
        settings.setCashDeskPrinterIp("192.168.1.103");
        settings.setEstablishmentName("OpenBar Live");

        legalConfig = new EstablishmentConfig();
        legalConfig.setLegalName("OpenBar SARL");
    }

    @Test
    @DisplayName("getPrinterStatus returns correctly mapped DTO from AppSettings")
    void getPrinterStatus_returnsConfiguredStatus() {
        when(appSettingsService.getSettings()).thenReturn(settings);

        PrinterStatusDTO status = printingService.getPrinterStatus();

        assertThat(status.directPrintingEnabled()).isTrue();
        assertThat(status.printerPort()).isEqualTo(9100);
        assertThat(status.barPrinterIp()).isEqualTo("192.168.1.101");
        assertThat(status.kitchenPrinterIp()).isEqualTo("192.168.1.102");
        assertThat(status.cashDeskPrinterIp()).isEqualTo("192.168.1.103");
    }

    @Test
    @DisplayName("printTestTicket sends bytes when printer is reachable")
    void printTestTicket_successfulSocketTransmission() throws IOException {
        when(appSettingsService.getSettings()).thenReturn(settings);
        doNothing().when(socketClient).send(eq("192.168.1.101"), eq(9100), any(byte[].class), anyInt());

        PrintResultDTO result = printingService.printTestTicket(PrinterRole.BAR);

        assertThat(result.success()).isTrue();
        assertThat(result.ip()).isEqualTo("192.168.1.101");
        assertThat(result.port()).isEqualTo(9100);
        assertThat(result.role()).isEqualTo(PrinterRole.BAR.name());
        verify(socketClient).send(eq("192.168.1.101"), eq(9100), any(byte[].class), eq(2500));
    }

    @Test
    @DisplayName("printTestTicket returns failed result without throwing exception when printer offline")
    void printTestTicket_offlinePrinter_returnsFailureResult() throws IOException {
        when(appSettingsService.getSettings()).thenReturn(settings);
        doThrow(new IOException("Connection timed out")).when(socketClient)
                .send(eq("192.168.1.101"), eq(9100), any(byte[].class), anyInt());

        PrintResultDTO result = printingService.printTestTicket(PrinterRole.BAR);

        assertThat(result.success()).isFalse();
        assertThat(result.message()).contains("Connection timed out");
    }

    @Test
    @DisplayName("dispatchOrder routes BAR items to BAR printer and KITCHEN items to KITCHEN printer")
    void dispatchOrder_routesItemsToAppropriatePrinters() throws IOException {
        when(appSettingsService.getSettings()).thenReturn(settings);

        Commande commande = new Commande();
        commande.setId(10L);

        Cocktail cocktailBar = new Cocktail();
        cocktailBar.setNom("Gin Tonic");
        cocktailBar.setStation(PreparationStation.BAR);

        Cocktail snackKitchen = new Cocktail();
        snackKitchen.setNom("Frites");
        snackKitchen.setStation(PreparationStation.KITCHEN);

        CommandeItem itemBar = new CommandeItem();
        itemBar.setCocktail(cocktailBar);
        itemBar.setQuantite(2);

        CommandeItem itemKitchen = new CommandeItem();
        itemKitchen.setCocktail(snackKitchen);
        itemKitchen.setQuantite(1);

        commande.setItems(List.of(itemBar, itemKitchen));

        when(commandeRepository.findById(10L)).thenReturn(Optional.of(commande));
        doNothing().when(socketClient).send(anyString(), anyInt(), any(byte[].class), anyInt());

        List<PrintResultDTO> results = printingService.dispatchOrder(10L);

        assertThat(results).hasSize(2);
        assertThat(results.get(0).success()).isTrue();
        assertThat(results.get(1).success()).isTrue();
        verify(socketClient).send(eq("192.168.1.101"), eq(9100), any(byte[].class), anyInt());
        verify(socketClient).send(eq("192.168.1.102"), eq(9100), any(byte[].class), anyInt());
    }

    @Test
    @DisplayName("dispatchOrder does nothing when directPrintingEnabled is false")
    void dispatchOrder_disabledPrinting_returnsSkippedResult() {
        settings.setDirectPrintingEnabled(false);
        when(appSettingsService.getSettings()).thenReturn(settings);

        Commande commande = new Commande();
        commande.setId(11L);
        when(commandeRepository.findById(11L)).thenReturn(Optional.of(commande));

        List<PrintResultDTO> results = printingService.dispatchOrder(11L);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).success()).isFalse();
        assertThat(results.get(0).message()).contains("disabled");
        verifyNoInteractions(socketClient);
    }

    @Test
    @DisplayName("dispatchOrder throws ResourceNotFoundException if order does not exist")
    void dispatchOrder_notFound_throwsException() {
        when(commandeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> printingService.dispatchOrder(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("printInvoiceReceipt prints customer receipt and opens cash drawer on cash desk printer")
    void printInvoiceReceipt_printsToCashDeskPrinter() throws IOException {
        when(appSettingsService.getSettings()).thenReturn(settings);
        when(establishmentConfigService.getConfig()).thenReturn(legalConfig);

        Facture facture = new Facture();
        facture.setId(50L);
        facture.setNumero("FAC-0050");
        facture.setTotal(new BigDecimal("35.00"));
        when(factureRepository.findById(50L)).thenReturn(Optional.of(facture));
        doNothing().when(socketClient).send(anyString(), anyInt(), any(byte[].class), anyInt());

        PrintResultDTO result = printingService.printInvoiceReceipt(50L, true);

        assertThat(result.success()).isTrue();
        assertThat(result.ip()).isEqualTo("192.168.1.103");
        verify(socketClient).send(eq("192.168.1.103"), eq(9100), any(byte[].class), eq(2500));
    }

    @Test
    @DisplayName("openCashDrawer sends kick pulse to cash desk printer")
    void openCashDrawer_sendsKickPulse() throws IOException {
        when(appSettingsService.getSettings()).thenReturn(settings);
        doNothing().when(socketClient).send(anyString(), anyInt(), any(byte[].class), anyInt());

        PrintResultDTO result = printingService.openCashDrawer();

        assertThat(result.success()).isTrue();
        verify(socketClient).send("192.168.1.103", 9100, formatter.formatCashDrawerKick(), 2500);
    }
}
