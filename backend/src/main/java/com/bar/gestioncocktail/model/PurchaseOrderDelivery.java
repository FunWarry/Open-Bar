package com.bar.gestioncocktail.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * JPA entity representing a physical goods receipt (Bon de Livraison intake) event,
 * capturing delivery notes and incoming batches for traceability and audit.
 */
@Entity
@Table(name = "purchase_order_deliveries")
public class PurchaseOrderDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Purchase order is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @NotNull(message = "Reception timestamp is required")
    @Column(name = "date_reception", nullable = false)
    private LocalDateTime dateReception;

    @Size(max = 100, message = "Delivery slip reference cannot exceed 100 characters")
    @Column(name = "bon_livraison_ref")
    private String bonLivraisonRef;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "received_by_id")
    private User receivedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "delivery", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchaseOrderDeliveryItem> items = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Default constructor required by JPA.
     */
    public PurchaseOrderDelivery() {
        // Default constructor for JPA entity instantiation
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now(ZoneId.systemDefault());
        if (this.dateReception == null) {
            this.dateReception = LocalDateTime.now(ZoneId.systemDefault());
        }
    }

    /**
     * Adds an item to this delivery receipt and maintains the bi-directional relationship.
     *
     * @param item delivery line item
     */
    public void addItem(PurchaseOrderDeliveryItem item) {
        if (item != null) {
            items.add(item);
            item.setDelivery(this);
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PurchaseOrder getPurchaseOrder() {
        return purchaseOrder;
    }

    public void setPurchaseOrder(PurchaseOrder purchaseOrder) {
        this.purchaseOrder = purchaseOrder;
    }

    public LocalDateTime getDateReception() {
        return dateReception;
    }

    public void setDateReception(LocalDateTime dateReception) {
        this.dateReception = dateReception;
    }

    public String getBonLivraisonRef() {
        return bonLivraisonRef;
    }

    public void setBonLivraisonRef(String bonLivraisonRef) {
        this.bonLivraisonRef = bonLivraisonRef;
    }

    public User getReceivedBy() {
        return receivedBy;
    }

    public void setReceivedBy(User receivedBy) {
        this.receivedBy = receivedBy;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public List<PurchaseOrderDeliveryItem> getItems() {
        return items;
    }

    public void setItems(List<PurchaseOrderDeliveryItem> items) {
        this.items = items != null ? items : new ArrayList<>();
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PurchaseOrderDelivery that = (PurchaseOrderDelivery) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
