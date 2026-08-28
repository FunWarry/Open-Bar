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
    private final CorsOriginResolver corsOriginResolver;

    /**
     * Constructs WebSocketConfig with authentication interceptor and CORS origin resolver.
     *
     * @param webSocketAuthInterceptor WebSocket STOMP authentication interceptor
     * @param corsOriginResolver Resolver for CORS allowed origins
     */
    public WebSocketConfig(
            WebSocketAuthInterceptor webSocketAuthInterceptor,
            CorsOriginResolver corsOriginResolver) {
        this.webSocketAuthInterceptor = webSocketAuthInterceptor;
        this.corsOriginResolver = corsOriginResolver;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] originPatterns = corsOriginResolver.resolveEffectiveOrigins().toArray(String[]::new);
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
}
 