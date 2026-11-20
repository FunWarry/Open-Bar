package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.config.LicenseProperties;
import com.bar.gestioncocktail.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.PublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.Date;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Cryptographic service responsible for asymmetric JWT signature verification (ECDSA ES256/ES384/ES512
 * and RSA RS256/RS384/RS512) and structured extraction of OpenBar license claims.
 */
@Service
public class LicenseCryptoService {

    private static final Logger log = LoggerFactory.getLogger(LicenseCryptoService.class);
    private static final Set<String> SUPPORTED_EC_ALGS = Set.of("ES256", "ES384", "ES512");
    private static final Set<String> SUPPORTED_RSA_ALGS = Set.of("RS256", "RS384", "RS512");
    private static final String BEGIN_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----";
    private static final String END_PUBLIC_KEY = "-----END PUBLIC KEY-----";

    private final LicenseProperties licenseProperties;
    private final ObjectMapper objectMapper;

    /**
     * Constructs LicenseCryptoService with licensing configuration and JSON mapper.
     *
     * @param licenseProperties Licensing properties holding embedded PEM public keys
     * @param objectMapper      Jackson object mapper for JWT header inspection
     */
    public LicenseCryptoService(LicenseProperties licenseProperties, ObjectMapper objectMapper) {
        this.licenseProperties = licenseProperties;
        this.objectMapper = objectMapper;
    }

    /**
     * Verifies an asymmetric JWT license token signature and extracts its payload claims.
     * Expired tokens still pass cryptographic verification so the caller can evaluate the 2-day grace window;
     * forged signatures, unsupported algorithms (e.g. HS256/none), or malformed tokens are rejected.
     *
     * @param rawToken Compact JWT string
     * @return Verified {@link ParsedLicenseClaims}
     * @throws BusinessException if the token is malformed, uses a disallowed algorithm, or fails signature verification
     */
    public ParsedLicenseClaims parseAndVerify(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BusinessException("License token cannot be blank");
        }
        String token = rawToken.trim();
        String algorithm = extractJwtAlgorithm(token);
        PublicKey verificationKey = resolveVerificationKey(algorithm);

        Claims claims = verifyAndExtractClaims(token, verificationKey);
        String establishmentId = extractEstablishmentId(claims);
        String plan = extractPlan(claims);
        List<String> modules = extractModules(claims);

        Date expiration = claims.getExpiration();
        if (expiration == null) {
            throw new BusinessException("License token is missing mandatory expiration timestamp (exp)");
        }
        Instant issuedAt = claims.getIssuedAt() != null ? claims.getIssuedAt().toInstant() : null;

        return new ParsedLicenseClaims(
                establishmentId,
                plan,
                modules,
                issuedAt,
                expiration.toInstant()
        );
    }

    /**
     * Computes a human-readable SHA-256 fingerprint of the primary configured public key.
     *
     * @return Colon-delimited uppercase hex fingerprint, or "UNCONFIGURED" if absent
     */
    public String getPublicKeyFingerprint() {
        String pem = licenseProperties.getPublicKeyPem();
        if (pem == null || pem.isBlank()) {
            return "UNCONFIGURED";
        }
        try {
            PublicKey key = parsePublicKeyFromPem(pem);
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(key.getEncoded());
            String hex = HexFormat.of().withUpperCase().formatHex(digest);
            StringBuilder formatted = new StringBuilder();
            for (int i = 0; i < Math.min(hex.length(), 32); i += 2) {
                if (i > 0) {
                    formatted.append(':');
                }
                formatted.append(hex, i, i + 2);
            }
            return formatted.toString();
        } catch (NoSuchAlgorithmException | IllegalArgumentException ex) {
            log.warn("Could not compute public key fingerprint: {}", ex.getMessage());
            return "INVALID";
        }
    }

    private Claims verifyAndExtractClaims(String token, PublicKey publicKey) {
        try {
            return Jwts.parser()
                    .verifyWith(publicKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException expiredEx) {
            // Signature has already been verified by JJWT before throwing ExpiredJwtException
            return expiredEx.getClaims();
        } catch (JwtException | IllegalArgumentException ex) {
            throw new BusinessException("Invalid license signature or malformed token: " + ex.getMessage());
        }
    }

    private String extractJwtAlgorithm(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3 || parts[0].isBlank() || parts[1].isBlank() || parts[2].isBlank()) {
            throw new BusinessException("Malformed license token: expected compact 3-part JWS format");
        }
        try {
            byte[] headerBytes = Base64.getUrlDecoder().decode(parts[0]);
            JsonNode header = objectMapper.readTree(new String(headerBytes, StandardCharsets.UTF_8));
            String alg = header.path("alg").asText("").trim().toUpperCase(Locale.ROOT);
            if (!SUPPORTED_EC_ALGS.contains(alg) && !SUPPORTED_RSA_ALGS.contains(alg)) {
                throw new BusinessException("Unsupported or insecure license signing algorithm: " + (alg.isEmpty() ? "none" : alg));
            }
            return alg;
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("Unable to decode license token header: " + ex.getMessage());
        }
    }

    private PublicKey resolveVerificationKey(String algorithm) {
        boolean isRsa = SUPPORTED_RSA_ALGS.contains(algorithm);
        String primaryPem = licenseProperties.getPublicKeyPem();
        String secondaryRsaPem = licenseProperties.getRsaPublicKeyPem();

        if (isRsa) {
            if (secondaryRsaPem != null && !secondaryRsaPem.isBlank()) {
                return parseKeyForAlgorithm(secondaryRsaPem, "RSA");
            }
            return parseKeyForAlgorithm(primaryPem, "RSA");
        }
        return parseKeyForAlgorithm(primaryPem, "EC");
    }

    private PublicKey parseKeyForAlgorithm(String pem, String expectedKeyType) {
        if (pem == null || pem.isBlank()) {
            throw new BusinessException("No public key configured for " + expectedKeyType + " license verification");
        }
        try {
            String normalized = pem.replace("\\n", "\n")
                    .replace(BEGIN_PUBLIC_KEY, "")
                    .replace(END_PUBLIC_KEY, "")
                    .replaceAll("\\s+", "");
            byte[] decoded = Base64.getDecoder().decode(normalized);
            X509EncodedKeySpec keySpec = new X509EncodedKeySpec(decoded);
            return KeyFactory.getInstance(expectedKeyType).generatePublic(keySpec);
        } catch (NoSuchAlgorithmException | InvalidKeySpecException | IllegalArgumentException ex) {
            throw new BusinessException("Failed to load " + expectedKeyType + " public key: " + ex.getMessage());
        }
    }

    private PublicKey parsePublicKeyFromPem(String pem) {
        try {
            return parseKeyForAlgorithm(pem, "EC");
        } catch (BusinessException ecEx) {
            return parseKeyForAlgorithm(pem, "RSA");
        }
    }

    private String extractEstablishmentId(Claims claims) {
        Object estClaim = claims.get("establishmentId");
        String establishmentId = estClaim != null ? String.valueOf(estClaim).trim() : "";
        if (establishmentId.isEmpty() && claims.getSubject() != null) {
            establishmentId = claims.getSubject().trim();
        }
        if (establishmentId.isEmpty()) {
            throw new BusinessException("License token is missing mandatory establishmentId or sub claim");
        }
        return establishmentId;
    }

    private String extractPlan(Claims claims) {
        Object planClaim = claims.get("plan");
        if (planClaim == null) {
            return "PRO";
        }
        String rawPlan = String.valueOf(planClaim).trim().toUpperCase(Locale.ROOT);
        return rawPlan.isEmpty() ? "PRO" : rawPlan;
    }

    private List<String> extractModules(Claims claims) {
        Object modulesObj = claims.get("licensedModules");
        if (modulesObj == null) {
            modulesObj = claims.get("modules");
        }
        if (modulesObj == null) {
            return List.of("*");
        }
        List<String> result = new ArrayList<>();
        if (modulesObj instanceof Collection<?> collection) {
            for (Object item : collection) {
                if (item != null) {
                    String trimmed = String.valueOf(item).trim().toUpperCase(Locale.ROOT);
                    if (!trimmed.isEmpty()) {
                        result.add(trimmed);
                    }
                }
            }
        } else if (modulesObj instanceof String str) {
            for (String token : str.split(",")) {
                String trimmed = token.trim().toUpperCase(Locale.ROOT);
                if (!trimmed.isEmpty()) {
                    result.add(trimmed);
                }
            }
        }
        return result.isEmpty() ? List.of("*") : List.copyOf(result);
    }

    /**
     * Immutable representation of verified claims extracted from a signed JWT license token.
     *
     * @param establishmentId Bound establishment identifier or wildcard '*'
     * @param plan            Subscription tier name
     * @param licensedModules List of unlocked module identifiers or '*'
     * @param issuedAt        Token issuance instant (may be null)
     * @param expiresAt       Token expiration instant (mandatory)
     */
    public record ParsedLicenseClaims(
            String establishmentId,
            String plan,
            List<String> licensedModules,
            Instant issuedAt,
            Instant expiresAt
    ) {
    }
}
