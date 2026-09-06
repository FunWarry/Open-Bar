package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.AppSettings;
import org.springframework.data.jpa.repository.JpaRepository;
/**
 * Spring Data JPA repository for establishment customization settings persistence.
 */

public interface AppSettingsRepository extends JpaRepository<AppSettings, Long> {
}
