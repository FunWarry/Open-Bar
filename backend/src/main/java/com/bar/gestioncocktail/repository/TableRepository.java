package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.TableEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TableRepository extends JpaRepository<TableEntity, Long> {
    java.util.Optional<TableEntity> findByNumero(Integer numero);
    List<TableEntity> findByZone(String zone);
    List<TableEntity> findByOccupee(boolean occupee);
    List<TableEntity> findByServeurId(Long serveurId);

    @Query("SELECT DISTINCT t.zone FROM TableEntity t WHERE t.zone IS NOT NULL AND t.zone <> '' ORDER BY t.zone")
    List<String> findDistinctZones();

    long countByOccupeeTrue();
}
