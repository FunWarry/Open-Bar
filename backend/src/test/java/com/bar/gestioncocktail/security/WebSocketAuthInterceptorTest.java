package com.bar.gestioncocktail.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthInterceptorTest {

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserDetailsService userDetailsService;

    @Mock
    private MessageChannel messageChannel;

    private WebSocketAuthInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new WebSocketAuthInterceptor(jwtTokenProvider, userDetailsService);
    }

    @Test
    void testPreSendConnectValidToken() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer validToken123");
        accessor.setLeaveMutable(true);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        when(jwtTokenProvider.validateToken("validToken123")).thenReturn(true);
        when(jwtTokenProvider.getUsernameFromJWT("validToken123")).thenReturn("admin");
        UserDetails userDetails = new User("admin", "pass", Collections.emptyList());
        when(userDetailsService.loadUserByUsername("admin")).thenReturn(userDetails);

        Message<?> result = interceptor.preSend(message, messageChannel);
        assertNotNull(result);
    }

    @Test
    void testPreSendConnectMissingAuthorizationHeader() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    void testPreSendConnectInvalidToken() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer invalidToken");
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        when(jwtTokenProvider.validateToken("invalidToken")).thenReturn(false);

        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    void testPreSendConnectUserNotFound() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer validToken");
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        when(jwtTokenProvider.validateToken("validToken")).thenReturn(true);
        when(jwtTokenProvider.getUsernameFromJWT("validToken")).thenReturn("unknown");
        when(userDetailsService.loadUserByUsername("unknown"))
                .thenThrow(new UsernameNotFoundException("User not found"));

        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    void testPreSendNonConnectCommandIgnored() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);
        assertEquals(message, result);
        verifyNoInteractions(jwtTokenProvider);
    }
}
