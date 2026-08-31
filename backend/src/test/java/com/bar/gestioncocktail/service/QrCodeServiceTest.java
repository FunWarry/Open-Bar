package com.bar.gestioncocktail.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.awt.image.BufferedImage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Comprehensive unit tests for {@link QrCodeService} validating PNG matrix generation,
 * SVG vector rendering, Wi-Fi configuration formatting, and table ordering URL resolution.
 */
class QrCodeServiceTest {

    private QrCodeService qrCodeService;

    @BeforeEach
    void setUp() {
        qrCodeService = new QrCodeService();
    }

    @Nested
    @DisplayName("PNG QR Code Generation")
    class PngGenerationTests {

        @Test
        @DisplayName("Should generate non-empty PNG byte array with valid PNG magic header bytes")
        void generatePng_nominal_returnsValidPngBytes() {
            byte[] pngBytes = qrCodeService.generatePng("https://openbar.lan/client/commande?table=1", 200, 200);

            assertThat(pngBytes)
                .isNotEmpty()
                .hasSizeGreaterThan(100);
            // Verify PNG magic header signature: 0x89 0x50 0x4E 0x47 (‰PNG)
            assertThat((int) (pngBytes[0] & 0xFF)).isEqualTo(0x89);
            assertThat((int) (pngBytes[1] & 0xFF)).isEqualTo(0x50);
            assertThat((int) (pngBytes[2] & 0xFF)).isEqualTo(0x4E);
            assertThat((int) (pngBytes[3] & 0xFF)).isEqualTo(0x47);
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when content is null or blank")
        void generatePng_emptyContent_throwsException() {
            assertThatThrownBy(() -> qrCodeService.generatePng("", 200, 200))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("QR code content cannot be null or empty");

            assertThatThrownBy(() -> qrCodeService.generatePng(null, 200, 200))
                .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("BufferedImage QR Code Generation")
    class BufferedImageGenerationTests {

        @Test
        @DisplayName("Should generate non-null BufferedImage with requested dimensions")
        void generateBufferedImage_nominal_returnsRenderedImage() {
            BufferedImage image = qrCodeService.generateBufferedImage("https://openbar.lan/client/commande?table=7", 180, 180);

            assertThat(image).isNotNull();
            assertThat(image.getWidth()).isEqualTo(180);
            assertThat(image.getHeight()).isEqualTo(180);
        }
    }

    @Nested
    @DisplayName("SVG Vector QR Code Generation")
    class SvgGenerationTests {

        @Test
        @DisplayName("Should generate valid SVG XML containing root svg, rect background, and path modules")
        void generateSvg_nominal_returnsValidSvgXml() {
            String svg = qrCodeService.generateSvg("https://openbar.lan/client/commande?table=3", 250);

            assertThat(svg)
                .isNotBlank()
                .contains("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")
                .contains("<svg xmlns=\"http://www.w3.org/2000/svg\"")
                .contains("viewBox=")
                .contains("width=\"250\"")
                .contains("height=\"250\"")
                .contains("<rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>")
                .contains("<path fill=\"#000000\" d=\"")
                .contains("</svg>");
        }
    }

    @Nested
    @DisplayName("Wi-Fi Payload Formatting")
    class WifiPayloadTests {

        @Test
        @DisplayName("Should format standard WPA Wi-Fi payload")
        void formatWifiPayload_wpa_returnsStandardPayload() {
            String payload = qrCodeService.formatWifiPayload("OpenBar-Guest", "SecretPass123", "WPA");

            assertThat(payload).isEqualTo("WIFI:S:OpenBar-Guest;T:WPA;P:SecretPass123;;");
        }

        @Test
        @DisplayName("Should format open Wi-Fi network with nopass")
        void formatWifiPayload_nopass_returnsPayloadWithoutPassword() {
            String payload = qrCodeService.formatWifiPayload("OpenBar-Free", "", "nopass");

            assertThat(payload).isEqualTo("WIFI:S:OpenBar-Free;T:nopass;;");
        }

        @Test
        @DisplayName("Should escape special characters in SSID and password")
        void formatWifiPayload_specialCharacters_escapesProperly() {
            String payload = qrCodeService.formatWifiPayload("Bar;Special:WiFi", "P@ss:w;o,r\"d\\", "WPA");

            assertThat(payload).isEqualTo("WIFI:S:Bar\\;Special\\:WiFi;T:WPA;P:P@ss\\:w\\;o\\,r\\\"d\\\\;;");
        }

        @Test
        @DisplayName("Should return empty string when SSID is null or empty")
        void formatWifiPayload_emptySsid_returnsEmptyString() {
            assertThat(qrCodeService.formatWifiPayload(null, "pass", "WPA")).isEmpty();
            assertThat(qrCodeService.formatWifiPayload("   ", "pass", "WPA")).isEmpty();
        }
    }

    @Nested
    @DisplayName("Table Order URL Building")
    class TableOrderUrlTests {

        @Test
        @DisplayName("Should construct full client ordering URL with table parameter")
        void buildTableOrderUrl_nominal_returnsFullUrl() {
            String url = qrCodeService.buildTableOrderUrl("https://openbar.lan", 4);

            assertThat(url).isEqualTo("https://openbar.lan/client/commande?table=4");
        }

        @Test
        @DisplayName("Should strip trailing slash from base URL")
        void buildTableOrderUrl_trailingSlash_stripsSlash() {
            String url = qrCodeService.buildTableOrderUrl("https://192.168.1.50:8443/", 12);

            assertThat(url).isEqualTo("https://192.168.1.50:8443/client/commande?table=12");
        }

        @Test
        @DisplayName("Should fallback to default base URL and table 1 when inputs are missing")
        void buildTableOrderUrl_nullInputs_usesDefaults() {
            String url = qrCodeService.buildTableOrderUrl(null, null);

            assertThat(url).isEqualTo("https://openbar.lan/client/commande?table=1");
        }
    }
}
