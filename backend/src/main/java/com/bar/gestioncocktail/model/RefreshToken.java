package com.bar.gestioncocktail.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;
/**
 * JPA entity representing a persistent JWT refresh token associated with a user.
 */

@Data
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private Instant expiryDate;
}
