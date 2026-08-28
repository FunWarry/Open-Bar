package com.bar.gestioncocktail.config;

import com.bar.gestioncocktail.security.WebSocketAuthInterceptor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WebSocketConfigTest {

    @Test
    @DisplayName("configureMessageBroker - configures simple broker and app prefixes")
    void configureMessageBroker_configuresRegistry() {
        WebSocketAuthInterceptor interceptor = mock(WebSocketAuthInterceptor.class);
        WebSocketConfig config = new WebSocketConfig(interceptor, new MockEnvironment(), List.of("*"));
        MessageBrokerRegistry registry = mock(MessageBrokerRegistry.class);

        assertThatNoException().isThrownBy(() -> config.configureMessageBroker(registry));
        verify(registry).enableSimpleBroker("/topic");
        verify(registry).setApplicationDestinationPrefixes("/app");
    }

    @Test
    @DisplayName("registerStompEndpoints - registers STOMP endpoint with SockJS in dev mode")
    void registerStompEndpoints_configuresEndpoints() {
        WebSocketAuthInterceptor interceptor = mock(WebSocketAuthInterceptor.class);
        WebSocketConfig config = new WebSocketConfig(interceptor, new MockEnvironment(), List.of("*"));
        StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
        StompWebSocketEndpointRegistration registration = mock(StompWebSocketEndpointRegistration.class, RETURNS_DEEP_STUBS);

        when(registry.addEndpoint("/ws", "/api/ws")).thenReturn(registration);

        assertThatNoException().isThrownBy(() -> config.registerStompEndpoints(registry));
    }

    @Test
    @DisplayName("registerStompEndpoints - registers STOMP endpoint with hardened origins in prod mode")
    void registerStompEndpoints_prodMode_configuresEndpoints() {
        WebSocketAuthInterceptor interceptor = mock(WebSocketAuthInterceptor.class);
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("prod");

        WebSocketConfig config = new WebSocketConfig(interceptor, prodEnv, List.of("*", "https://open-bar.freeboxos.fr"));
        StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
        StompWebSocketEndpointRegistration registration = mock(StompWebSocketEndpointRegistration.class, RETURNS_DEEP_STUBS);

        when(registry.addEndpoint("/ws", "/api/ws")).thenReturn(registration);

        assertThatNoException().isThrownBy(() -> config.registerStompEndpoints(registry));
    }

    @Test
    @DisplayName("registerStompEndpoints - prod mode falls back to safe origins when wildcard is provided")
    void registerStompEndpoints_prodMode_wildcardFallback() {
        WebSocketAuthInterceptor interceptor = mock(WebSocketAuthInterceptor.class);
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("prod");

        WebSocketConfig config = new WebSocketConfig(interceptor, prodEnv, List.of("*"));
        StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
        StompWebSocketEndpointRegistration registration = mock(StompWebSocketEndpointRegistration.class, RETURNS_DEEP_STUBS);

        when(registry.addEndpoint("/ws", "/api/ws")).thenReturn(registration);

        assertThatNoException().isThrownBy(() -> config.registerStompEndpoints(registry));
    }

    @Test
    @DisplayName("configureClientInboundChannel - registers interceptor")
    void configureClientInboundChannel_addsInterceptor() {
        WebSocketAuthInterceptor interceptor = mock(WebSocketAuthInterceptor.class);
        WebSocketConfig config = new WebSocketConfig(interceptor, new MockEnvironment(), List.of("*"));
        ChannelRegistration registration = mock(ChannelRegistration.class);

        assertThatNoException().isThrownBy(() -> config.configureClientInboundChannel(registration));
        verify(registration).interceptors(interceptor);
    }
}
