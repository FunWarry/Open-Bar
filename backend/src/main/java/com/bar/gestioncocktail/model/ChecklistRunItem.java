package com.bar.gestioncocktail.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
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
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * Entity representing an individual task executed within a specific checklist run session.
 * Tracks completion status, timestamp, author attribution, notes, and verification photo proof.
 */
@Entity
@Table(name = "checklist_run_items")
public class ChecklistRunItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id", nullable = false)
    @JsonBackReference
    private ChecklistRun run;

    @Column(name = "template_item_id")
    private Long templateItemId;

    @NotBlank(message = "Task title is mandatory")
    @Size(max = 200, message = "Task title cannot exceed 200 characters")
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_mandatory", nullable = false)
    private Boolean isMandatory = true;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_role", length = 20)
    private UserRole targetRole;

    @Column(name = "assigned_roles", length = 255)
    private String assignedRoles;

    @Column(name = "assigned_user_ids", length = 255)
    private String assignedUserIds;

    @Column(name = "assigned_usernames", length = 500)
    private String assignedUsernames;

    @Enumerated(EnumType.STRING)
    @Column(name = "media_type", length = 30)
    private ChecklistMediaType mediaType = ChecklistMediaType.NONE;

    @Column(name = "media_url", columnDefinition = "TEXT")
    private String mediaUrl;

    @Column(name = "video_embed_url", columnDefinition = "TEXT")
    private String videoEmbedUrl;

    @Column(name = "media_attachments_json", columnDefinition = "TEXT")
    private String mediaAttachmentsJson;

    @Column(name = "steps_json", columnDefinition = "TEXT")
    private String stepsJson;

    @Column(name = "is_completed", nullable = false)
    private Boolean isCompleted = false;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "completed_by_id")
    private User completedBy;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Column(name = "photo_proof_url", columnDefinition = "TEXT")
    private String photoProofUrl;

    /**
     * Default constructor for JPA.
     */
    public ChecklistRunItem() {
        // Default constructor required by JPA
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ChecklistRun getRun() {
        return run;
    }

    public void setRun(ChecklistRun run) {
        this.run = run;
    }

    public Long getTemplateItemId() {
        return templateItemId;
    }

    public void setTemplateItemId(Long templateItemId) {
        this.templateItemId = templateItemId;
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

    public Boolean getIsMandatory() {
        return isMandatory == null || isMandatory;
    }

    public void setIsMandatory(Boolean mandatory) {
        isMandatory = mandatory;
    }

    public Integer getOrderIndex() {
        return orderIndex != null ? orderIndex : 0;
    }

    public void setOrderIndex(Integer orderIndex) {
        this.orderIndex = orderIndex;
    }

    public UserRole getTargetRole() {
        return targetRole;
    }

    public void setTargetRole(UserRole targetRole) {
        this.targetRole = targetRole;
    }

    public ChecklistMediaType getMediaType() {
        return mediaType != null ? mediaType : ChecklistMediaType.NONE;
    }

    public void setMediaType(ChecklistMediaType mediaType) {
        this.mediaType = mediaType;
    }

    public String getMediaUrl() {
        return mediaUrl;
    }

    public void setMediaUrl(String mediaUrl) {
        this.mediaUrl = mediaUrl;
    }

    public String getVideoEmbedUrl() {
        return videoEmbedUrl;
    }

    public void setVideoEmbedUrl(String videoEmbedUrl) {
        this.videoEmbedUrl = videoEmbedUrl;
    }

    public Boolean getIsCompleted() {
        return Boolean.TRUE.equals(isCompleted);
    }

    public void setIsCompleted(Boolean completed) {
        isCompleted = completed;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public User getCompletedBy() {
        return completedBy;
    }

    public void setCompletedBy(User completedBy) {
        this.completedBy = completedBy;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getPhotoProofUrl() {
        return photoProofUrl;
    }

    public void setPhotoProofUrl(String photoProofUrl) {
        this.photoProofUrl = photoProofUrl;
    }

    public String getAssignedRoles() {
        return assignedRoles;
    }

    public void setAssignedRoles(String assignedRoles) {
        this.assignedRoles = assignedRoles;
    }

    public String getAssignedUserIds() {
        return assignedUserIds;
    }

    public void setAssignedUserIds(String assignedUserIds) {
        this.assignedUserIds = assignedUserIds;
    }

    public String getAssignedUsernames() {
        return assignedUsernames;
    }

    public void setAssignedUsernames(String assignedUsernames) {
        this.assignedUsernames = assignedUsernames;
    }

    public String getMediaAttachmentsJson() {
        return mediaAttachmentsJson;
    }

    public void setMediaAttachmentsJson(String mediaAttachmentsJson) {
        this.mediaAttachmentsJson = mediaAttachmentsJson;
    }

    public String getStepsJson() {
        return stepsJson;
    }

    public void setStepsJson(String stepsJson) {
        this.stepsJson = stepsJson;
    }
}
