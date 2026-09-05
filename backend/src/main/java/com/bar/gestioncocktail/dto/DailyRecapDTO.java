package com.bar.gestioncocktail.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Data Transfer Object representing the daily closing financial summary report (Z-Report / Daily Register Closing) in OpenBar.
 * Contains total revenue KPIs, VAT breakdown by tax rate, payment mode breakdown, and guest statistics.
 *
 * @param date                   Target summary date
 * @param totalCaTtc             Total revenue including VAT
 * @param totalCaHt              Total revenue excluding VAT
 * @param totalTva               Total VAT tax collected
 * @param nombreFacturesReglees Total settled invoices count
 * @param panierMoyen            Average revenue per invoice
 * @param nombreClients          Total guests / customers served
 * @param ventilationModePaiement Payment method breakdown list
 * @param ventilationTva         VAT tax breakdown list per rate
 */
public record DailyRecapDTO(
    LocalDate date,
    BigDecimal totalCaTtc,
    BigDecimal totalCaHt,
    BigDecimal totalTva,
    int nombreFacturesReglees,
    BigDecimal panierMoyen,
    int nombreClients,
    List<PaymentModeSummaryDTO> ventilationModePaiement,
    List<VatSummaryDTO> ventilationTva
) {}
