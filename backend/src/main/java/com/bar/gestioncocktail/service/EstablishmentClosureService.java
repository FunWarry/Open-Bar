package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.EstablishmentClosureDTO;
import com.bar.gestioncocktail.dto.EstablishmentClosureRequestDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.ClosureType;
import com.bar.gestioncocktail.model.EstablishmentClosure;
import com.bar.gestioncocktail.repository.EstablishmentClosureRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Business service managing recurring weekly closed days and one-off/annual holiday closures.
 */
@Service
@Transactional(readOnly = true)
public class EstablishmentClosureService {

    private final EstablishmentClosureRepository repository;

    public EstablishmentClosureService(EstablishmentClosureRepository repository) {
        this.repository = repository;
    }

    /**
     * Retrieves all configured establishment closures.
     *
     * @return List of EstablishmentClosureDTO
     */
    public List<EstablishmentClosureDTO> getAllClosures() {
        return repository.findAll().stream()
                .map(EstablishmentClosureDTO::from)
                .toList();
    }

    /**
     * Checks if the establishment is closed on a target date (supports single dates and date ranges).
     *
     * @param date Target LocalDate
     * @return true if closed, false otherwise
     */
    public boolean isClosedOnDate(LocalDate date) {
        if (date == null) return false;

        // 1. Check weekly recurring closed days
        if (repository.findByTypeAndDayOfWeek(ClosureType.WEEKLY_RECURRING, date.getDayOfWeek()).isPresent()) {
            return true;
        }

        // 2. Check exceptional/annual closures
        return repository.findByType(ClosureType.EXCEPTIONAL).stream()
                .anyMatch(c -> matchesExceptionalClosure(c, date));
    }

    private boolean matchesExceptionalClosure(EstablishmentClosure closure, LocalDate date) {
        if (closure.getClosureDate() == null) return false;

        LocalDate start = closure.getClosureDate();
        LocalDate end = closure.getEndDate() != null ? closure.getEndDate() : start;

        if (!date.isBefore(start) && !date.isAfter(end)) {
            return true;
        }

        return Boolean.TRUE.equals(closure.getIsAnnualRecurring())
                && matchesAnnualRecurringRange(start, end, date);
    }

    private boolean matchesAnnualRecurringRange(LocalDate start, LocalDate end, LocalDate target) {
        int startMmDd = start.getMonthValue() * 100 + start.getDayOfMonth();
        int endMmDd = end.getMonthValue() * 100 + end.getDayOfMonth();
        int targetMmDd = target.getMonthValue() * 100 + target.getDayOfMonth();

        if (startMmDd <= endMmDd) {
            return targetMmDd >= startMmDd && targetMmDd <= endMmDd;
        } else {
            return targetMmDd >= startMmDd || targetMmDd <= endMmDd;
        }
    }

    /**
     * Creates or updates a closure rule.
     *
     * @param dto EstablishmentClosureRequestDTO
     * @return Created EstablishmentClosureDTO
     */
    @Transactional
    public EstablishmentClosureDTO createClosure(EstablishmentClosureRequestDTO dto) {
        if (dto.type() == null) {
            throw new BusinessException("Le type de fermeture est obligatoire");
        }
        if (ClosureType.WEEKLY_RECURRING.equals(dto.type()) && dto.dayOfWeek() == null) {
            throw new BusinessException("Le jour de la semaine est obligatoire pour une fermeture hebdomadaire");
        }
        if (ClosureType.EXCEPTIONAL.equals(dto.type()) && dto.closureDate() == null) {
            throw new BusinessException("La date de fermeture est obligatoire pour une fermeture exceptionnelle");
        }
        if (dto.closureDate() != null && dto.endDate() != null && dto.endDate().isBefore(dto.closureDate())) {
            throw new BusinessException("La date de fin ne peut pas être antérieure à la date de début");
        }

        // Check duplicate weekly closure
        if (ClosureType.WEEKLY_RECURRING.equals(dto.type())) {
            repository.findByTypeAndDayOfWeek(ClosureType.WEEKLY_RECURRING, dto.dayOfWeek())
                    .ifPresent(existing -> {
                        throw new BusinessException("Une fermeture existe déjà pour " + dto.dayOfWeek());
                    });
        }

        EstablishmentClosure closure = new EstablishmentClosure();
        closure.setType(dto.type());
        closure.setDayOfWeek(dto.dayOfWeek());
        closure.setClosureDate(dto.closureDate());
        closure.setEndDate(dto.endDate());
        closure.setIsAnnualRecurring(Boolean.TRUE.equals(dto.isAnnualRecurring()));
        closure.setReason(dto.reason() != null ? dto.reason().trim() : "Fermeture");

        return EstablishmentClosureDTO.from(repository.save(closure));
    }

    /**
     * Deletes a closure rule by ID.
     *
     * @param id Closure ID
     */
    @Transactional
    public void deleteClosure(Long id) {
        EstablishmentClosure closure = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fermeture introuvable avec l'ID: " + id));
        repository.delete(closure);
    }
}
