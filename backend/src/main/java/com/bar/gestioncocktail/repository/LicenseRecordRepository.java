package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.LicenseRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for managing the establishment's {@link LicenseRecord}.
 */
@Repository
public interface LicenseRecordRepository extends JpaRepository<LicenseRecord, Long> {
}
