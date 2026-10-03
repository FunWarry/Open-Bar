package com.bar.gestioncocktail.service.tpe;

import com.bar.gestioncocktail.model.TpeTransactionStatus;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

import static com.bar.gestioncocktail.service.tpe.ConcertProtocolConstants.*;

/**
 * Low-level packet framing, serialization, checksum generation, and response parsing
 * for the Concert / CB IP card payment terminal protocol.
 */
public class ConcertFrameBuilder {

    /**
     * Parsed outcome and transaction details extracted from a terminal response frame.
     *
     * @param posId             2-character terminal station identifier
     * @param status            Mapped transaction status
     * @param amount            Charged amount in decimal currency
     * @param authorizationCode Bank authorization reference (e.g. AUTH-123456)
     * @param cardBrand         Card scheme (e.g. CB, VISA, MASTERCARD)
     * @param maskedPan         Masked card number (e.g. **** **** **** 4242)
     * @param sequenceNumber    Transaction sequence number (STAN)
     * @param rawPayload        Full decoded ASCII message payload
     */
    public record ConcertResponse(
        String posId,
        TpeTransactionStatus status,
        BigDecimal amount,
        String authorizationCode,
        String cardBrand,
        String maskedPan,
        String sequenceNumber,
        String rawPayload
    ) {}

    /**
     * Computes the Longitudinal Redundancy Check (LRC) checksum byte by XOR-ing
     * all bytes in the specified byte array range.
     *
     * @param data   Byte buffer
     * @param offset Start offset (inclusive)
     * @param length Number of bytes to include in the XOR sum
     * @return Single byte LRC checksum
     */
    public static byte calculateLrc(byte[] data, int offset, int length) {
        Objects.requireNonNull(data, "Data array cannot be null");
        byte lrc = 0;
        for (int i = offset; i < offset + length; i++) {
            lrc ^= data[i];
        }
        return lrc;
    }

    /**
     * Builds a complete, framed Concert Debit / Sale request frame with control characters and LRC.
     * <p>
     * Format: {@code <STX> + [posId (2)] + ['C' (1)] + [amountCents (8)] + [currency (3)] + [ref (optional)] + <ETX> + <LRC>}
     * </p>
     *
     * @param posId         2-digit POS station identifier (e.g. "01")
     * @param amountInCents Charge amount in centimes (e.g. 1250 for 12.50 €)
     * @param currencyCode  3-character ISO numeric currency code (e.g. "978" for EUR)
     * @param privateData   Optional order/invoice reference (e.g. "TAB-42")
     * @return Complete binary frame byte array ready to transmit
     */
    public static byte[] buildDebitFrame(String posId, long amountInCents, String currencyCode, String privateData) {
        String safePosId = (posId != null && !posId.isBlank()) ? String.format("%2s", posId.trim()).replace(' ', '0') : "01";
        if (safePosId.length() > 2) {
            safePosId = safePosId.substring(0, 2);
        }

        String safeAmount = String.format("%08d", Math.max(0, amountInCents));
        String safeCurrency = resolveCurrencyNumericCode(currencyCode);
        String safeRef = (privateData != null) ? privateData.trim().replaceAll("[^a-zA-Z0-9_-]", "") : "";
        if (safeRef.length() > 10) {
            safeRef = safeRef.substring(0, 10);
        }

        String payload = safePosId + OP_DEBIT + safeAmount + safeCurrency + safeRef;
        byte[] payloadBytes = payload.getBytes(StandardCharsets.US_ASCII);

        // Frame structure: STX (1 byte) + payload (N bytes) + ETX (1 byte) + LRC (1 byte)
        byte[] frame = new byte[payloadBytes.length + 3];
        frame[0] = STX;
        System.arraycopy(payloadBytes, 0, frame, 1, payloadBytes.length);
        int etxIndex = payloadBytes.length + 1;
        frame[etxIndex] = ETX;

        // LRC includes all bytes strictly after STX up to and including ETX
        frame[etxIndex + 1] = calculateLrc(frame, 1, payloadBytes.length + 1);

        return frame;
    }

    /**
     * Parses and validates a raw response byte frame received from the card terminal.
     *
     * @param frame Raw byte array received over TCP socket
     * @return Decoded {@link ConcertResponse} containing outcome and authorization details
     * @throws IllegalArgumentException If frame is malformed, missing framing characters, or fails LRC check
     */
    public static ConcertResponse parseResponseFrame(byte[] frame) {
        if (frame == null || frame.length < 4) {
            throw new IllegalArgumentException("Invalid Concert response frame: too short (" + (frame == null ? 0 : frame.length) + " bytes)");
        }

        if (frame[0] != STX) {
            throw new IllegalArgumentException("Invalid Concert frame: missing leading STX (0x02)");
        }

        int etxIndex = -1;
        for (int i = 1; i < frame.length - 1; i++) {
            if (frame[i] == ETX) {
                etxIndex = i;
                break;
            }
        }

        if (etxIndex == -1 || etxIndex + 1 >= frame.length) {
            throw new IllegalArgumentException("Invalid Concert frame: missing terminating ETX or LRC byte");
        }

        byte expectedLrc = calculateLrc(frame, 1, etxIndex);
        byte actualLrc = frame[etxIndex + 1];
        if (expectedLrc != actualLrc) {
            throw new IllegalArgumentException(String.format("LRC Checksum mismatch: expected 0x%02X but received 0x%02X", expectedLrc, actualLrc));
        }

        String payload = new String(frame, 1, etxIndex - 1, StandardCharsets.US_ASCII);
        return parsePayload(payload);
    }

    private record CardDetails(String cardBrand, String maskedPan, String sequence) {}

    private static ConcertResponse parsePayload(String payload) {
        String posId = resolvePosId(payload);
        TpeTransactionStatus status = resolveStatus(payload);
        BigDecimal amount = parseAmount(payload);
        String authCode = parseAuthCode(payload, status);
        CardDetails card = parseCardDetails(payload);

        return new ConcertResponse(posId, status, amount, authCode, card.cardBrand(), card.maskedPan(), card.sequence(), payload);
    }

    private static String resolvePosId(String payload) {
        return (payload.length() >= 2) ? payload.substring(0, 2) : "01";
    }

    private static TpeTransactionStatus resolveStatus(String payload) {
        char resultCode = (payload.length() >= 3) ? payload.charAt(2) : RESULT_CANCELLED;
        return switch (resultCode) {
            case RESULT_APPROVED -> TpeTransactionStatus.APPROVED;
            case RESULT_REFUSED -> TpeTransactionStatus.DECLINED;
            default -> TpeTransactionStatus.CANCELLED;
        };
    }

    private static BigDecimal parseAmount(String payload) {
        if (payload.length() < 11) {
            return BigDecimal.ZERO;
        }
        try {
            long cents = Long.parseLong(payload.substring(3, 11));
            return BigDecimal.valueOf(cents).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        } catch (NumberFormatException _) {
            return BigDecimal.ZERO;
        }
    }

    private static String parseAuthCode(String payload, TpeTransactionStatus status) {
        String authCode = null;
        if (payload.length() >= 17) {
            int authEnd = Math.min(payload.length(), 19);
            authCode = payload.substring(11, authEnd).trim();
            if (authCode.isBlank() && status == TpeTransactionStatus.APPROVED) {
                authCode = "AUTH-OK";
            }
        }
        if (status == TpeTransactionStatus.APPROVED && authCode == null) {
            authCode = "AUTH-APP";
        }
        return authCode;
    }

    private static CardDetails parseCardDetails(String payload) {
        if (payload.length() <= 19) {
            return new CardDetails("CB", null, null);
        }

        String cardBrand = "CB";
        String maskedPan = null;
        String sequence = null;

        String[] parts = payload.substring(19).split("[ ;|]+");
        for (String part : parts) {
            String p = part.trim();
            if (isBrandToken(p)) {
                cardBrand = p;
            } else if (maskedPan == null && isPanToken(p)) {
                maskedPan = formatPan(p);
            } else if (sequence == null && isSequenceToken(p)) {
                sequence = p;
            }
        }

        return new CardDetails(cardBrand, maskedPan, sequence);
    }

    private static boolean isBrandToken(String p) {
        return p.startsWith("CB") || p.startsWith("VISA") || p.startsWith("MC") || p.startsWith("AMEX");
    }

    private static boolean isPanToken(String p) {
        return p.contains("*") || p.matches("^\\d{4}$");
    }

    private static String formatPan(String p) {
        return p.contains("*") ? p : "************" + p;
    }

    private static boolean isSequenceToken(String p) {
        return p.matches("^\\d{6}$");
    }

    /**
     * Resolves 3-letter currency alphabetic code to 3-digit ISO numeric code.
     *
     * @param currency 3-letter currency code (e.g. EUR, USD, CHF, GBP)
     * @return 3-digit ISO numeric code
     */
    public static String resolveCurrencyNumericCode(String currency) {
        if (currency == null || currency.isBlank()) {
            return CURRENCY_EUR;
        }
        return switch (currency.trim().toUpperCase()) {
            case "USD" -> CURRENCY_USD;
            case "CHF" -> CURRENCY_CHF;
            case "GBP" -> CURRENCY_GBP;
            default -> CURRENCY_EUR;
        };
    }
}
