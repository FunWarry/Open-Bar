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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity representing a reusable operational checklist template or SOP definition.
 */
@Entity
@Table(name = "checklist_templates")
public class ChecklistTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Template title is mandatory")
    @Size(max = 150, message = "Template title cannot exceed 150 characters")
    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @NotNull(message = "Category is mandatory")
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private ChecklistCategory category = ChecklistCategory.OTHER;

    @Column(name = "estimated_duration_minutes")
    private Integer estimatedDurationMinutes = 15;

    @Column(name = "icon", length = 50)
    private String icon = "checkbox-outline";

    @Column(name = "color", length = 30)
    private String color = "var(--primary)";

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    @JsonManagedReference
    private List<ChecklistTemplateItem> items = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Default constructor for JPA.
     */
    public ChecklistTemplate() {
        // Default constructor required by JPA
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(ZoneId.systemDefault());
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneId.systemDefault());
    }

    /**
     * Helper method to attach an item maintaining bidirectional relationship.
     *
     * @param item Item to add
     */
    public void addItem(ChecklistTemplateItem item) {
        items.add(item);
        item.setTemplate(this);
    }

    /**
     * Helper method to remove an item maintaining bidirectional relationship.
     *
     * @param item Item to remove
     */
    public void removeItem(ChecklistTemplateItem item) {
        items.remove(item);
        item.setTemplate(null);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ChecklistCategory getCategory() {
        return category;
    }

    public void setCategory(ChecklistCategory category) {
        this.category = category;
    }

    public Integer getEstimatedDurationMinutes() {
        return estimatedDurationMinutes != null ? estimatedDurationMinutes : 15;
    }

    public void setEstimatedDurationMinutes(Integer estimatedDurationMinutes) {
        this.estimatedDurationMinutes = estimatedDurationMinutes;
    }

    public String getIcon() {
        return icon != null ? icon : "checkbox-outline";
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getColor() {
        return color != null ? color : "var(--primary)";
    }

    public void setColor(String color) {
        this.color = color;
    }

    public Boolean getIsActive() {
        return isActive == null || isActive;
    }

    public void setIsActive(Boolean active) {
        isActive = active;
    }

    public List<ChecklistTemplateItem> getItems() {
        return items;
    }

    public void setItems(List<ChecklistTemplateItem> items) {
        this.items = items;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
