package com.bar.gestioncocktail.security;

import org.jspecify.annotations.Nullable;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * STOMP ChannelInterceptor that validates JWT tokens on WebSocket CONNECT frames
 * and enforces role-based topic subscription and message sending permissions.
 */
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final String ROLE_ANONYMOUS = "ROLE_ANONYMOUS";

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;

    public WebSocketAuthInterceptor(JwtTokenProvider jwtTokenProvider, UserDetailsService userDetailsService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public @Nullable Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            accessor = StompHeaderAccessor.wrap(message);
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            handleConnect(accessor, message);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            handleSubscribe(accessor, message);
        } else if (StompCommand.SEND.equals(accessor.getCommand())) {
            handleSend(accessor, message);
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor, Message<?> message) {
        String authorization = accessor.getFirstNativeHeader("Authorization");
        String guestSession = accessor.getFirstNativeHeader("X-Guest-Session");
        String sessionToken = accessor.getFirstNativeHeader("X-Session-Token");

        if (authorization != null && authorization.startsWith("Bearer ")) {
            authenticateJwt(authorization.substring(7), accessor, message);
            return;
        }

        String guestId = resolveGuestIdentifier(guestSession, sessionToken, authorization);
        if (guestId != null) {
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    "guest:" + guestId, null, List.of(new SimpleGrantedAuthority(ROLE_ANONYMOUS)));
            accessor.setUser(auth);
            return;
        }

        throw new MessageDeliveryException(message, "Missing Authorization header");
    }

    private void authenticateJwt(String token, StompHeaderAccessor accessor, Message<?> message) {
        if (!jwtTokenProvider.validateToken(token)) {
            throw new MessageDeliveryException(message, "Invalid or expired JWT token");
        }
        String username = jwtTokenProvider.getUsernameFromJWT(token);
        try {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            accessor.setUser(auth);
        } catch (UsernameNotFoundException _) {
            throw new MessageDeliveryException(message, "Invalid credentials.");
        }
    }

    private String resolveGuestIdentifier(String guestSession, String sessionToken, String authorization) {
        if (guestSession != null && !guestSession.isBlank()) {
            return guestSession;
        }
        if (sessionToken != null && !sessionToken.isBlank()) {
            return sessionToken;
        }
        if (authorization != null && authorization.startsWith("Guest ")) {
            return authorization.substring(6);
        }
        return null;
    }

    private void handleSubscribe(StompHeaderAccessor accessor, Message<?> message) {
        String destination = accessor.getDestination();
        if (destination == null || !isProtectedTopic(destination)) {
            return;
        }

        if (!isAuthenticatedStaff(accessor)) {
            throw new MessageDeliveryException(message, "Unauthorized topic subscription: " + destination);
        }
    }

    private void handleSend(StompHeaderAccessor accessor, Message<?> message) {
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith("/app/")) {
            return;
        }

        if (!isAuthenticatedStaff(accessor)) {
            throw new MessageDeliveryException(message, "Unauthorized WebSocket command destination: " + destination);
        }
    }

    private boolean isAuthenticatedStaff(StompHeaderAccessor accessor) {
        return accessor.getUser() instanceof Authentication auth
                && auth.getAuthorities() != null
                && !auth.getAuthorities().isEmpty()
                && auth.getAuthorities().stream()
                .noneMatch(a -> ROLE_ANONYMOUS.equals(a.getAuthority()));
    }

    private boolean isProtectedTopic(String destination) {
        return destination.startsWith("/topic/commandes")
                || destination.startsWith("/topic/barman")
                || destination.startsWith("/topic/serveur")
                || destination.startsWith("/topic/stock")
                || destination.startsWith("/topic/schedule")
                || destination.startsWith("/topic/reservations")
                || destination.startsWith("/topic/bar-tabs")
                || destination.startsWith("/topic/preparation")
                || destination.startsWith("/topic/checklists")
                || "/topic/tables".equals(destination);
    }
}