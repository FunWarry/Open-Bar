package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.ZoneEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ZoneRepository extends JpaRepository<ZoneEntity, Long> {
    Optional<ZoneEntity> findByNom(String nom);
    boolean existsByNom(String nom);
    boolean existsByEtage(String etage);
}
