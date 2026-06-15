package com.bar.gestioncocktail.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String username;
    private List<String> roles;
    private String email;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
} 