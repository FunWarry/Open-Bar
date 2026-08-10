package com.bar.gestioncocktail.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity representing a published week schedule.
 * <p>
 * Each row records that a manager published the planning for a given week,
 * identified by the ISO date of the Monday ({@code weekStart}).
 * Publishing the same week again performs an upsert (update of publishedAt/publishedBy).
 */
@Entity
@Table(name = "week_schedule_publications")
public class WeekSchedulePublication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * ISO date of the Monday starting the published week (UNIQUE constraint).
     */
    @Column(name = "week_start", nullable = false, unique = true)
    private LocalDate weekStart;

    /**
     * Timestamp when the planning was last published.
     */
    @Column(name = "published_at", nullable = false)
    private LocalDateTime publishedAt;

    /**
     * Username (login) of the manager who published the planning.
     */
    @Column(name = "published_by", nullable = false)
    private String publishedBy;

    /**
     * JSON snapshot of employee shifts at publication time for diff and history comparison.
     */
    @Column(name = "snapshot_json", columnDefinition = "TEXT")
    private String snapshotJson;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getWeekStart() { return weekStart; }
    public void setWeekStart(LocalDate weekStart) { this.weekStart = weekStart; }

    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }

    public String getPublishedBy() { return publishedBy; }
    public void setPublishedBy(String publishedBy) { this.publishedBy = publishedBy; }

    public String getSnapshotJson() { return snapshotJson; }
    public void setSnapshotJson(String snapshotJson) { this.snapshotJson = snapshotJson; }
}
