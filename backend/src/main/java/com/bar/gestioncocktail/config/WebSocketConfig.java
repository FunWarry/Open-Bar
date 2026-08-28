package com.bar.gestioncocktail.config;

import com.bar.gestioncocktail.security.WebSocketAuthInterceptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

/**
 * WebSocket STOMP message broker configuration.
 * Configures message broker destinations, STOMP endpoints, authentication interceptors,
 * and origin restrictions.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;
    private final Environment environment;
    private final List<String> allowedOriginPatterns;

    /**
     * Constructs WebSocketConfig with authentication interceptor, Spring environment, and allowed origin patterns.
     *
     * @param webSocketAuthInterceptor WebSocket STOMP authentication interceptor
     * @param environment Spring environment to inspect active profiles
     * @param allowedOriginPatterns List of allowed CORS origin patterns
     */
    public WebSocketConfig(
            WebSocketAuthInterceptor webSocketAuthInterceptor,
            Environment environment,
            @Value("${openbar.cors.allowed-origin-patterns:${OPENBAR_CORS_ALLOWED_ORIGINS:*}}") List<String> allowedOriginPatterns) {
        this.webSocketAuthInterceptor = webSocketAuthInterceptor;
        this.environment = environment;
        this.allowedOriginPatterns = allowedOriginPatterns;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] originPatterns = resolveEffectiveOrigins().toArray(String[]::new);
        registry.addEndpoint("/ws", "/api/ws")
            .setAllowedOriginPatterns(originPatterns);
        registry.addEndpoint("/ws", "/api/ws")
            .setAllowedOriginPatterns(originPatterns)
            .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(webSocketAuthInterceptor);
    }

    private List<String> resolveEffectiveOrigins() {
        if (isProdProfile()) {
            List<String> filtered = (allowedOriginPatterns != null)
                    ? allowedOriginPatterns.stream()
                            .filter(p -> p != null && !p.trim().equals("*") && !p.trim().isEmpty())
                            .toList()
                    : List.of();
            if (filtered.isEmpty()) {
                log.warn("Wildcard '*' or empty CORS origin is disallowed for WebSocket in production. Falling back to default authorized local/PWA origins.");
                return List.of(
                        "http://localhost:[*]",
                        "http://127.0.0.1:[*]",
                        "https://open-bar.freeboxos.fr",
                        "http://192.168.*:[*]",
                        "http://10.*:[*]",
                        "http://172.16.*:[*]"
                );
            }
            return filtered;
        }
        return (allowedOriginPatterns != null && !allowedOriginPatterns.isEmpty())
                ? allowedOriginPatterns
                : List.of("*");
    }

    private boolean isProdProfile() {
        return environment != null && environment.acceptsProfiles(Profiles.of("prod"));
    }
}
 