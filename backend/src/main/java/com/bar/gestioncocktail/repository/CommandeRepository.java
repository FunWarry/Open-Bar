package com.bar.gestioncocktail.repository;

import com.bar.gestioncocktail.model.Commande;
import com.bar.gestioncocktail.model.CommandeStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CommandeRepository extends JpaRepository<Commande, Long> {
    List<Commande> findByTable(TableEntity table);
    List<Commande> findByServeur(User serveur);
    List<Commande> findByStatut(CommandeStatut statut);
    List<Commande> findByTableAndStatut(TableEntity table, CommandeStatut statut);
    List<Commande> findByDateCommandeBetween(LocalDateTime debut, LocalDateTime fin);
    List<Commande> findByStatutAndDateCommandeBefore(CommandeStatut statut, LocalDateTime date);
} 