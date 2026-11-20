package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.config.LicenseProperties;
import com.bar.gestioncocktail.exception.BusinessException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link LicenseCryptoService} covering ECDSA/RSA asymmetric JWT verification,
 * tampered token rejection, disallowed algorithm blocking, and expired claim extraction.
 */
class LicenseCryptoServiceTest {

    private static KeyPair ecKeyPair;
    private static KeyPair otherEcKeyPair;
    private static KeyPair rsaKeyPair;
    private static String ecPublicKeyPem;
    private static String rsaPublicKeyPem;

    @BeforeAll
    static void generateTestKeys() throws Exception {
        KeyPairGenerator ecGen = KeyPairGenerator.getInstance("EC");
        ecGen.initialize(new ECGenParameterSpec("secp256r1"));
        ecKeyPair = ecGen.generateKeyPair();
        otherEcKeyPair = ecGen.generateKeyPair();

        KeyPairGenerator rsaGen = KeyPairGenerator.getInstance("RSA");
        rsaGen.initialize(2048);
        rsaKeyPair = rsaGen.generateKeyPair();

        ecPublicKeyPem = toPem(ecKeyPair.getPublic().getEncoded());
        rsaPublicKeyPem = toPem(rsaKeyPair.getPublic().getEncoded());
    }

    private static String toPem(byte[] encoded) {
        String base64 = Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.UTF_8))
                .encodeToString(encoded);
        return "-----BEGIN PUBLIC KEY-----\n" + base64 + "\n-----END PUBLIC KEY-----";
    }

    private LicenseCryptoService createService(String ecPem, String rsaPem) {
        LicenseProperties props = new LicenseProperties();
        props.setPublicKeyPem(ecPem);
        props.setRsaPublicKeyPem(rsaPem);
        return new LicenseCryptoService(props, new ObjectMapper());
    }

    @Test
    void parseAndVerify_validEcdsaToken_extractsClaims() {
        LicenseCryptoService service = createService(ecPublicKeyPem, "");
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        Instant exp = now.plus(30, ChronoUnit.DAYS);

        String token = Jwts.builder()
                .subject("73282932000074")
                .claim("establishmentId", "73282932000074")
                .claim("plan", "pro")
                .claim("licensedModules", List.of("FLOOR_PLAN", "HAPPY_HOUR"))
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(ecKeyPair.getPrivate(), Jwts.SIG.ES256)
                .compact();

        LicenseCryptoService.ParsedLicenseClaims claims = service.parseAndVerify(token);

        assertThat(claims.establishmentId()).isEqualTo("73282932000074");
        assertThat(claims.plan()).isEqualTo("PRO");
        assertThat(claims.licensedModules()).containsExactly("FLOOR_PLAN", "HAPPY_HOUR");
        assertThat(claims.expiresAt()).isEqualTo(exp);
    }

    @Test
    void parseAndVerify_validRsaToken_extractsClaims() {
        LicenseCryptoService service = createService(ecPublicKeyPem, rsaPublicKeyPem);
        Instant exp = Instant.now().plus(15, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);

        String token = Jwts.builder()
                .subject("73282932000074")
                .claim("plan", "ENTERPRISE")
                .claim("modules", "*")
                .expiration(Date.from(exp))
                .signWith(rsaKeyPair.getPrivate(), Jwts.SIG.RS256)
                .compact();

        LicenseCryptoService.ParsedLicenseClaims claims = service.parseAndVerify(token);

        assertThat(claims.establishmentId()).isEqualTo("73282932000074");
        assertThat(claims.plan()).isEqualTo("ENTERPRISE");
        assertThat(claims.licensedModules()).containsExactly("*");
    }

    @Test
    void parseAndVerify_expiredButValidSignature_returnsClaimsForGraceEvaluation() {
        LicenseCryptoService service = createService(ecPublicKeyPem, "");
        Instant exp = Instant.now().minus(12, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS);

        String token = Jwts.builder()
                .subject("73282932000074")
                .claim("plan", "ESSENTIAL")
                .expiration(Date.from(exp))
                .signWith(ecKeyPair.getPrivate(), Jwts.SIG.ES256)
                .compact();

        LicenseCryptoService.ParsedLicenseClaims claims = service.parseAndVerify(token);

        assertThat(claims.expiresAt()).isEqualTo(exp);
        assertThat(claims.plan()).isEqualTo("ESSENTIAL");
    }

    @Test
    void parseAndVerify_tamperedPayload_throwsBusinessException() {
        LicenseCryptoService service = createService(ecPublicKeyPem, "");
        String token = Jwts.builder()
                .subject("73282932000074")
                .claim("plan", "ESSENTIAL")
                .expiration(Date.from(Instant.now().plus(5, ChronoUnit.DAYS)))
                .signWith(ecKeyPair.getPrivate(), Jwts.SIG.ES256)
                .compact();

        String[] parts = token.split("\\.");
        String forgedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"sub\":\"*\",\"plan\":\"ENTERPRISE\",\"exp\":4070908800}".getBytes(StandardCharsets.UTF_8));
        String tampered = parts[0] + "." + forgedPayload + "." + parts[2];

        assertThatThrownBy(() -> service.parseAndVerify(tampered))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Invalid license signature");
    }

    @Test
    void parseAndVerify_wrongSigningKey_throwsBusinessException() {
        LicenseCryptoService service = createService(ecPublicKeyPem, "");
        String token = Jwts.builder()
                .subject("73282932000074")
                .expiration(Date.from(Instant.now().plus(5, ChronoUnit.DAYS)))
                .signWith(otherEcKeyPair.getPrivate(), Jwts.SIG.ES256)
                .compact();

        assertThatThrownBy(() -> service.parseAndVerify(token))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void parseAndVerify_unsignedOrHmacToken_isRejected() {
        LicenseCryptoService service = createService(ecPublicKeyPem, "");
        String hsHeader = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"sub\":\"*\",\"exp\":4070908800}".getBytes(StandardCharsets.UTF_8));
        String forgedHs = hsHeader + "." + payload + ".invalidsig";

        assertThatThrownBy(() -> service.parseAndVerify(forgedHs))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Unsupported or insecure license signing algorithm");
    }

    @Test
    void parseAndVerify_missingExpiration_throwsBusinessException() {
        LicenseCryptoService service = createService(ecPublicKeyPem, "");
        String token = Jwts.builder()
                .subject("73282932000074")
                .claim("plan", "PRO")
                .signWith(ecKeyPair.getPrivate(), Jwts.SIG.ES256)
                .compact();

        assertThatThrownBy(() -> service.parseAndVerify(token))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("missing mandatory expiration");
    }

    @Test
    void getPublicKeyFingerprint_validPem_returnsFormattedHex() {
        LicenseCryptoService service = createService(ecPublicKeyPem, "");
        String fingerprint = service.getPublicKeyFingerprint();
        assertThat(fingerprint).matches("([0-9A-F]{2}:){15}[0-9A-F]{2}");
    }

    @Test
    void parseAndVerify_blankOrMalformedToken_throwsBusinessException() {
        LicenseCryptoService service = createService(ecPublicKeyPem, "");
        assertThatThrownBy(() -> service.parseAndVerify("   "))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cannot be blank");
        assertThatThrownBy(() -> service.parseAndVerify("only.two"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("compact 3-part");
    }

    @Test
    void parseAndVerify_csvModulesAndMissingSubject_covered() {
        LicenseCryptoService service = createService(ecPublicKeyPem, "");
        String token = Jwts.builder()
                .claim("establishmentId", "73282932000074")
                .claim("modules", "floor_plan, happy_hour")
                .expiration(Date.from(Instant.now().plus(5, ChronoUnit.DAYS)))
                .signWith(ecKeyPair.getPrivate(), Jwts.SIG.ES256)
                .compact();

        LicenseCryptoService.ParsedLicenseClaims claims = service.parseAndVerify(token);
        assertThat(claims.licensedModules()).containsExactly("FLOOR_PLAN", "HAPPY_HOUR");
        assertThat(claims.plan()).isEqualTo("PRO");

        String missingSubToken = Jwts.builder()
                .claim("plan", "PRO")
                .expiration(Date.from(Instant.now().plus(5, ChronoUnit.DAYS)))
                .signWith(ecKeyPair.getPrivate(), Jwts.SIG.ES256)
                .compact();
        assertThatThrownBy(() -> service.parseAndVerify(missingSubToken))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("missing mandatory establishmentId");
    }

    @Test
    void getPublicKeyFingerprint_unconfiguredOrInvalidPem_returnsFallback() {
        assertThat(createService("", "").getPublicKeyFingerprint()).isEqualTo("UNCONFIGURED");
        assertThat(createService("not-a-valid-pem", "").getPublicKeyFingerprint()).isEqualTo("INVALID");
    }

    @Test
    void parseAndVerify_extractsMonetizationAndGraceClaims() {
        LicenseCryptoService service = createService(ecPublicKeyPem, "");
        Instant exp = Instant.now().plus(20, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
        Instant graceEnd = Instant.now().plus(3, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);

        String token = Jwts.builder()
                .subject("73282932000074")
                .claim("plan", "ENTERPRISE")
                .claim("tpeTier", "STRIPE_TERMINAL_CONNECT")
                .claim("option1RateBps", 120)
                .claim("option1FixedCents", 10)
                .claim("option3RateBps", 45)
                .claim("option3FixedCents", 5)
                .claim("commissionStatus", "GRACE_PERIOD")
                .claim("pendingCommissionAmount", "18.45")
                .claim("pendingCommissionInvoiceId", "in_grace_77")
                .claim("commissionGraceEndsAt", graceEnd.toString())
                .expiration(Date.from(exp))
                .signWith(ecKeyPair.getPrivate(), Jwts.SIG.ES256)
                .compact();

        LicenseCryptoService.ParsedLicenseClaims claims = service.parseAndVerify(token);

        assertThat(claims.monetization()).isNotNull();
        assertThat(claims.monetization().tpeTier()).isEqualTo("STRIPE_TERMINAL_CONNECT");
        assertThat(claims.monetization().option1RateBps()).isEqualTo(120);
        assertThat(claims.monetization().option3RateBps()).isEqualTo(45);
        assertThat(claims.monetization().commissionStatus()).isEqualTo("GRACE_PERIOD");
        assertThat(claims.monetization().pendingCommissionAmount()).isEqualByComparingTo("18.45");
        assertThat(claims.monetization().pendingCommissionInvoiceId()).isEqualTo("in_grace_77");
        assertThat(claims.monetization().commissionGraceEndsAt()).isEqualTo(graceEnd);
    }
}
