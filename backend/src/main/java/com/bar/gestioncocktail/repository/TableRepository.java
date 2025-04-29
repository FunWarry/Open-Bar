package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.TableZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TableRepository extends JpaRepository<TableEntity, Long> {
    List<TableEntity> findByZone(TableZone zone);
    List<TableEntity> findByOccupee(boolean occupee);
    List<TableEntity> findByServeurId(Long serveurId);
} 