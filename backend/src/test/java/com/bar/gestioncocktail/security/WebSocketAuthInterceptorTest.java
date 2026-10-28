package com.bar.gestioncocktail.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Collections;
import java.util.List;

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

    @ParameterizedTest
    @CsvSource({
            "X-Guest-Session, guest-uuid-1234, guest:guest-uuid-1234",
            "X-Session-Token, session-token-abcd, guest:session-token-abcd",
            "Authorization, Guest guest-direct, guest:guest-direct"
    })
    void testPreSendConnectWithGuestHeaders(String headerName, String headerValue, String expectedPrincipalName) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader(headerName, headerValue);
        accessor.setLeaveMutable(true);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);
        assertNotNull(result);
        StompHeaderAccessor resultAccessor = MessageHeaderAccessor.getAccessor(result, StompHeaderAccessor.class);
        assertNotNull(resultAccessor);
        assertNotNull(resultAccessor.getUser());
        assertEquals(expectedPrincipalName, resultAccessor.getUser().getName());
    }

    @Test
    void testPreSendSubscribePublicTopicAllowedForGuest() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/tables/5/cart");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "guest:123", null, List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        accessor.setLeaveMutable(true);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);
        assertNotNull(result);
    }

    @Test
    void testPreSendSubscribeProtectedTopicRejectedForGuest() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/commandes");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "guest:123", null, List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        accessor.setLeaveMutable(true);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    void testPreSendSubscribeProtectedTopicAllowedForStaff() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/commandes");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        accessor.setLeaveMutable(true);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);
        assertNotNull(result);
    }

    @Test
    void testPreSendSubscribeAdditionalProtectedTopicsRejectedForGuest() {
        for (String topic : List.of("/topic/bar-tabs", "/topic/preparation/BAR", "/topic/checklists", "/topic/tables")) {
            StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
            accessor.setDestination(topic);
            accessor.setUser(new UsernamePasswordAuthenticationToken(
                    "guest:123", null, List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
            accessor.setLeaveMutable(true);
            Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

            assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(message, messageChannel));
        }
    }

    @Test
    void testPreSendSendToAppDestinationRejectedForGuestAndAllowedForStaff() {
        StompHeaderAccessor guestAccessor = StompHeaderAccessor.create(StompCommand.SEND);
        guestAccessor.setDestination("/app/commandes/nouvelle");
        guestAccessor.setUser(new UsernamePasswordAuthenticationToken(
                "guest:123", null, List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        guestAccessor.setLeaveMutable(true);
        Message<?> guestMessage = MessageBuilder.createMessage(new byte[0], guestAccessor.getMessageHeaders());

        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(guestMessage, messageChannel));

        StompHeaderAccessor staffAccessor = StompHeaderAccessor.create(StompCommand.SEND);
        staffAccessor.setDestination("/app/commandes/nouvelle");
        staffAccessor.setUser(new UsernamePasswordAuthenticationToken(
                "serveur1", null, List.of(new SimpleGrantedAuthority("ROLE_SERVEUR"))));
        staffAccessor.setLeaveMutable(true);
        Message<?> staffMessage = MessageBuilder.createMessage(new byte[0], staffAccessor.getMessageHeaders());

        assertNotNull(interceptor.preSend(staffMessage, messageChannel));
    }
}
