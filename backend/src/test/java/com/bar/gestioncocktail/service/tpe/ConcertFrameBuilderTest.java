package com.bar.gestioncocktail.service.tpe;

import com.bar.gestioncocktail.model.TpeTransactionStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link ConcertFrameBuilder} validating ISO debit frame construction,
 * Longitudinal Redundancy Check (LRC) calculation, and Concert response parsing.
 */
class ConcertFrameBuilderTest {

    @Test
    @DisplayName("Should build valid debit frame with correct STX, ETX, and LRC checksum")
    void shouldBuildValidDebitFrame() {
        String posId = "01";
        long amountCents = 2450L;
        String currencyCode = "978"; // EUR

        byte[] frame = ConcertFrameBuilder.buildDebitFrame(posId, amountCents, currencyCode, "TAB1");

        assertThat(frame).isNotNull();
        assertThat(frame[0]).isEqualTo(ConcertProtocolConstants.STX);
        assertThat(frame[frame.length - 2]).isEqualTo(ConcertProtocolConstants.ETX);

        // Verify LRC: XOR of all bytes from STX (exclusive) through ETX (inclusive)
        byte calculatedLrc = 0;
        for (int i = 1; i <= frame.length - 2; i++) {
            calculatedLrc ^= frame[i];
        }
        assertThat(frame[frame.length - 1]).isEqualTo(calculatedLrc);
    }

    @Test
    @DisplayName("Should format amount into 8 zero-padded cents digits")
    void shouldFormatAmountCorrectly() {
        byte[] frame = ConcertFrameBuilder.buildDebitFrame("01", 500L, "978", null);

        String payload = new String(frame, 1, frame.length - 3);
        // Payload should start with POS '01', OP 'C', and amount '00000500'
        assertThat(payload).contains("00000500");
    }

    @Test
    @DisplayName("Should sanitize posId and private reference correctly")
    void shouldSanitizePosIdAndReference() {
        byte[] frame = ConcertFrameBuilder.buildDebitFrame("1", 1000L, "EUR", "ORDER#99!");
        String payload = new String(frame, 1, frame.length - 3);

        // PosId should be left-padded with 0 to 2 chars -> '01'
        assertThat(payload).startsWith("01C00001000978ORDER99");
    }

    @Test
    @DisplayName("Should parse approved Concert response successfully")
    void shouldParseApprovedResponse() {
        // Build mock response payload: POS(01) + Result('0') + Amount(00002350) + Auth(AUTH99  ) + PAN(************1234) + Brand(CB) + Seq(000001)
        String innerData = "01000002350AUTH99  CB ************1234 000001";
        byte[] rawResponse = buildMockResponseFrame(innerData);

        ConcertFrameBuilder.ConcertResponse parsed = ConcertFrameBuilder.parseResponseFrame(rawResponse);

        assertThat(parsed.status()).isEqualTo(TpeTransactionStatus.APPROVED);
        assertThat(parsed.amount()).isEqualByComparingTo(new BigDecimal("23.50"));
        assertThat(parsed.authorizationCode()).isEqualTo("AUTH99");
        assertThat(parsed.maskedPan()).isEqualTo("************1234");
        assertThat(parsed.cardBrand()).isEqualTo("CB");
        assertThat(parsed.sequenceNumber()).isEqualTo("000001");
    }

    @Test
    @DisplayName("Should parse declined Concert response when result code is refused")
    void shouldParseDeclinedResponse() {
        String innerData = "01100002350REJECT  CB ************1234 000002";
        byte[] rawResponse = buildMockResponseFrame(innerData);

        ConcertFrameBuilder.ConcertResponse parsed = ConcertFrameBuilder.parseResponseFrame(rawResponse);

        assertThat(parsed.status()).isEqualTo(TpeTransactionStatus.DECLINED);
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when response frame has invalid LRC")
    void shouldRejectCorruptedLrcResponse() {
        byte[] rawResponse = buildMockResponseFrame("01000002350AUTH99");
        // Corrupt LRC
        rawResponse[rawResponse.length - 1] = (byte) (rawResponse[rawResponse.length - 1] ^ 0xFF);

        assertThatThrownBy(() -> ConcertFrameBuilder.parseResponseFrame(rawResponse))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("LRC");
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when response frame is missing STX or ETX framing")
    void shouldRejectMalformedFraming() {
        byte[] rawResponse = new byte[] { 0x01, 0x02, 0x03 };

        assertThatThrownBy(() -> ConcertFrameBuilder.parseResponseFrame(rawResponse))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Should resolve currency numeric codes accurately")
    void shouldResolveCurrencyCodes() {
        assertThat(ConcertFrameBuilder.resolveCurrencyNumericCode("EUR")).isEqualTo(ConcertProtocolConstants.CURRENCY_EUR);
        assertThat(ConcertFrameBuilder.resolveCurrencyNumericCode("USD")).isEqualTo(ConcertProtocolConstants.CURRENCY_USD);
        assertThat(ConcertFrameBuilder.resolveCurrencyNumericCode("CHF")).isEqualTo(ConcertProtocolConstants.CURRENCY_CHF);
        assertThat(ConcertFrameBuilder.resolveCurrencyNumericCode("GBP")).isEqualTo(ConcertProtocolConstants.CURRENCY_GBP);
        assertThat(ConcertFrameBuilder.resolveCurrencyNumericCode(null)).isEqualTo(ConcertProtocolConstants.CURRENCY_EUR);
    }

    @Test
    @DisplayName("Should truncate long private reference exceeding 10 characters")
    void shouldTruncateLongReference() {
        byte[] frame = ConcertFrameBuilder.buildDebitFrame("01", 1000L, "EUR", "VERY_LONG_REFERENCE_ABC");
        String payload = new String(frame, 1, frame.length - 3);

        assertThat(payload).contains("VERY_LONG_");
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when frame lacks leading STX")
    void shouldRejectFrameMissingLeadingStx() {
        byte[] raw = new byte[] { 0x05, '0', '1', ConcertProtocolConstants.ETX, 0x00 };
        assertThatThrownBy(() -> ConcertFrameBuilder.parseResponseFrame(raw))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("missing leading STX");
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when frame lacks terminating ETX")
    void shouldRejectFrameMissingTerminatingEtx() {
        byte[] raw = new byte[] { ConcertProtocolConstants.STX, '0', '1', 0x00, 0x00 };
        assertThatThrownBy(() -> ConcertFrameBuilder.parseResponseFrame(raw))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("missing terminating ETX");
    }

    @Test
    @DisplayName("Should map unknown status code to CANCELLED and handle unparseable amount safely")
    void shouldMapUnknownStatusAndSafeAmount() {
        // POS(01) + Status('9' unknown) + Amount(invalidchars) + Auth(OK)
        byte[] raw = buildMockResponseFrame("019INVALID9AUTH   ");
        ConcertFrameBuilder.ConcertResponse response = ConcertFrameBuilder.parseResponseFrame(raw);

        assertThat(response.status()).isEqualTo(TpeTransactionStatus.CANCELLED);
        assertThat(response.amount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Should fallback card details when frame payload is short")
    void shouldFallbackCardDetailsOnShortPayload() {
        // Short frame (length < 22)
        byte[] raw = buildMockResponseFrame("01000001000");
        ConcertFrameBuilder.ConcertResponse response = ConcertFrameBuilder.parseResponseFrame(raw);

        assertThat(response.cardBrand()).isEqualTo("CB");
        assertThat(response.maskedPan()).isNull();
    }

    private byte[] buildMockResponseFrame(String content) {
        byte[] contentBytes = content.getBytes();
        byte[] frame = new byte[contentBytes.length + 3]; // STX + content + ETX + LRC
        frame[0] = ConcertProtocolConstants.STX;
        System.arraycopy(contentBytes, 0, frame, 1, contentBytes.length);
        frame[frame.length - 2] = ConcertProtocolConstants.ETX;

        byte lrc = 0;
        for (int i = 1; i <= frame.length - 2; i++) {
            lrc ^= frame[i];
        }
        frame[frame.length - 1] = lrc;
        return frame;
    }
}
