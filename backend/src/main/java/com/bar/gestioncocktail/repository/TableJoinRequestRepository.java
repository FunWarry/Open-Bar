package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.TableJoinRequest;
import com.bar.gestioncocktail.model.TableJoinRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link TableJoinRequest} management.
 */
@Repository
public interface TableJoinRequestRepository extends JpaRepository<TableJoinRequest, Long> {

    /**
     * Finds pending requests awaiting approval for a given table.
     *
     * @param tableId Table identifier
     * @param status Join request status
     * @return List of join requests
     */
    List<TableJoinRequest> findByTableIdAndStatus(Long tableId, TableJoinRequestStatus status);

    /**
     * Finds the latest request for a given table and applicant session identifier.
     *
     * @param tableId Table identifier
     * @param applicantSessionId Applicant session identifier
     * @return Optional join request
     */
    Optional<TableJoinRequest> findFirstByTableIdAndApplicantSessionIdOrderByCreatedAtDesc(Long tableId, String applicantSessionId);
}
