package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.AppSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingsRepository extends JpaRepository<AppSettings, Long> {
}
