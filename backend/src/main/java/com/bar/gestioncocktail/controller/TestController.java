package com.bar.gestioncocktail.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class TestController {
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Service is up and running");
    }

    @GetMapping("/blocked")
    public ResponseEntity<String> testEndpoint() {
        return ResponseEntity.ok("Test endpoint is blocking");
    }
}
