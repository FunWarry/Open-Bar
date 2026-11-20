package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.CommissionBillingRecord;
import com.bar.gestioncocktail.model.CommissionInvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link CommissionBillingRecord}.
 */
public interface CommissionBillingRecordRepository extends JpaRepository<CommissionBillingRecord, Long> {

    /**
     * Finds the billing summary record for a specific YYYY-MM period.
     *
     * @param billingPeriod Target month (YYYY-MM)
     * @return Billing record if present
     */
    Optional<CommissionBillingRecord> findByBillingPeriod(String billingPeriod);

    /**
     * Finds billing records ordered by billing period descending.
     *
     * @return All billing records newest first
     */
    List<CommissionBillingRecord> findAllByOrderByBillingPeriodDesc();

    /**
     * Finds billing records matching any of the given invoice statuses.
     *
     * @param statuses Target invoice statuses
     * @return Matching billing records
     */
    List<CommissionBillingRecord> findByInvoiceStatusInOrderByBillingPeriodDesc(List<CommissionInvoiceStatus> statuses);

    /**
     * Finds a billing record by remote Stripe Billing invoice identifier.
     *
     * @param remoteInvoiceId External Stripe invoice ID
     * @return Matching billing record if found
     */
    Optional<CommissionBillingRecord> findByRemoteInvoiceId(String remoteInvoiceId);
}
