package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.HappyHourRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for managing {@link HappyHourRule} promotional entities.
 */
@Repository
public interface HappyHourRuleRepository extends JpaRepository<HappyHourRule, Long> {

    /**
     * Retrieves all promotional rules that are flagged as active.
     *
     * @return List of active happy hour rules
     */
    List<HappyHourRule> findByActiveTrue();
}
