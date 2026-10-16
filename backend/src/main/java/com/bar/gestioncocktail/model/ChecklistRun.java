package com.bar.gestioncocktail.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity representing an active, completed, or cancelled execution session of an operational checklist.
 */
@Entity
@Table(name = "checklist_runs")
public class ChecklistRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_id")
    private Long templateId;

    @NotBlank(message = "Template title is mandatory")
    @Size(max = 150, message = "Template title cannot exceed 150 characters")
    @Column(name = "template_title", nullable = false, length = 150)
    private String templateTitle;

    @NotNull(message = "Category is mandatory")
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private ChecklistCategory category = ChecklistCategory.OTHER;

    @NotNull(message = "Status is mandatory")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ChecklistRunStatus status = ChecklistRunStatus.IN_PROGRESS;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "completed_by_id")
    private User completedBy;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "run", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    @JsonManagedReference
    private List<ChecklistRunItem> items = new ArrayList<>();

    /**
     * Default constructor for JPA.
     */
    public ChecklistRun() {
        // Default constructor required by JPA
    }

    @PrePersist
    protected void onCreate() {
        if (this.startedAt == null) {
            this.startedAt = LocalDateTime.now(ZoneId.systemDefault());
        }
    }

    /**
     * Helper method to attach an item to this run maintaining bidirectional relationship.
     *
     * @param item The run item to attach
     */
    public void addItem(ChecklistRunItem item) {
        items.add(item);
        item.setRun(this);
    }

    /**
     * Helper method to remove an item from this run.
     *
     * @param item The run item to remove
     */
    public void removeItem(ChecklistRunItem item) {
        items.remove(item);
        item.setRun(null);
    }

    /**
     * Calculates the count of completed items in this run.
     *
     * @return Number of items marked as completed
     */
    public int getCompletedItemsCount() {
        if (items == null || items.isEmpty()) {
            return 0;
        }
        return (int) items.stream().filter(item -> Boolean.TRUE.equals(item.getIsCompleted())).count();
    }

    /**
     * Returns total number of items in this run.
     *
     * @return Total count of tasks
     */
    public int getTotalItemsCount() {
        return items != null ? items.size() : 0;
    }

    /**
     * Calculates progress percentage from 0 to 100.
     *
     * @return Completion percentage
     */
    public int getCompletionPercentage() {
        int total = getTotalItemsCount();
        if (total == 0) {
            return 100;
        }
        return (int) Math.round(((double) getCompletedItemsCount() / total) * 100.0);
    }

    /**
     * Checks if all mandatory tasks in this run are completed.
     *
     * @return True if every mandatory task is completed
     */
    public boolean areMandatoryItemsCompleted() {
        if (items == null || items.isEmpty()) {
            return true;
        }
        return items.stream()
                .filter(item -> Boolean.TRUE.equals(item.getIsMandatory()))
                .allMatch(item -> Boolean.TRUE.equals(item.getIsCompleted()));
    }

    /**
     * Calculates the count of mandatory tasks still pending completion.
     *
     * @return Number of uncompleted mandatory tasks
     */
    public int getMandatoryPendingCount() {
        if (items == null || items.isEmpty()) {
            return 0;
        }
        return (int) items.stream()
                .filter(item -> Boolean.TRUE.equals(item.getIsMandatory()))
                .filter(item -> !Boolean.TRUE.equals(item.getIsCompleted()))
                .count();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTemplateId() {
        return templateId;
    }

    public void setTemplateId(Long templateId) {
        this.templateId = templateId;
    }

    public String getTemplateTitle() {
        return templateTitle;
    }

    public void setTemplateTitle(String templateTitle) {
        this.templateTitle = templateTitle;
    }

    public ChecklistCategory getCategory() {
        return category;
    }

    public void setCategory(ChecklistCategory category) {
        this.category = category;
    }

    public ChecklistRunStatus getStatus() {
        return status;
    }

    public void setStatus(ChecklistRunStatus status) {
        this.status = status;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public User getCompletedBy() {
        return completedBy;
    }

    public void setCompletedBy(User completedBy) {
        this.completedBy = completedBy;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public List<ChecklistRunItem> getItems() {
        return items;
    }

    public void setItems(List<ChecklistRunItem> items) {
        this.items = items;
    }
}
