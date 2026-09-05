package com.bar.gestioncocktail.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.EnumMap;
import java.util.Map;

/**
 * Service responsible for generating high-resolution QR codes in PNG and SVG formats,
 * supporting table digital ordering URLs and bar Wi-Fi network configuration payloads.
 */
@Service
public class QrCodeService {

    private final QRCodeWriter qrCodeWriter;

    /**
     * Constructs the QR code generation service.
     */
    public QrCodeService() {
        this.qrCodeWriter = new QRCodeWriter();
    }

    /**
     * Generates a QR code as a PNG byte array.
     *
     * @param content The text/URL content to encode
     * @param width   Target image width in pixels
     * @param height  Target image height in pixels
     * @return PNG image bytes
     */
    public byte[] generatePng(String content, int width, int height) {
        try {
            BitMatrix bitMatrix = encodeBitMatrix(content, width, height);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            return outputStream.toByteArray();
        } catch (WriterException | IOException e) {
            throw new IllegalStateException("Failed to generate PNG QR code for content: " + content, e);
        }
    }

    /**
     * Generates a QR code as a {@link BufferedImage} suitable for rendering in PDFs.
     *
     * @param content The text/URL content to encode
     * @param width   Target image width in pixels
     * @param height  Target image height in pixels
     * @return {@link BufferedImage} instance
     */
    public BufferedImage generateBufferedImage(String content, int width, int height) {
        try {
            BitMatrix bitMatrix = encodeBitMatrix(content, width, height);
            return MatrixToImageWriter.toBufferedImage(bitMatrix);
        } catch (WriterException e) {
            throw new IllegalStateException("Failed to generate buffered image QR code for content: " + content, e);
        }
    }

    /**
     * Generates a lightweight, scalable SVG XML string representation of the QR code.
     *
     * @param content The text/URL content to encode
     * @param size    Target viewport dimension (width and height in SVG units)
     * @return SVG XML string
     */
    public String generateSvg(String content, int size) {
        try {
            BitMatrix bitMatrix = encodeBitMatrix(content, size, size);
            int matrixWidth = bitMatrix.getWidth();
            int matrixHeight = bitMatrix.getHeight();

            StringBuilder svg = new StringBuilder();
            svg.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            svg.append("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ")
               .append(matrixWidth).append(" ").append(matrixHeight)
               .append("\" width=\"").append(size).append("\" height=\"").append(size)
               .append("\" shape-rendering=\"crispEdges\">\n");
            svg.append("  <rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>\n");
            svg.append("  <path fill=\"#000000\" d=\"");

            for (int y = 0; y < matrixHeight; y++) {
                for (int x = 0; x < matrixWidth; x++) {
                    if (bitMatrix.get(x, y)) {
                        svg.append(String.format("M%d,%dh1v1h-1z ", x, y));
                    }
                }
            }

            svg.append("\"/>\n");
            svg.append("</svg>\n");
            return svg.toString();
        } catch (WriterException e) {
            throw new IllegalStateException("Failed to generate SVG QR code for content: " + content, e);
        }
    }

    /**
     * Formats a standard Wi-Fi network configuration payload according to ZXing specification.
     * {@code WIFI:S:MySSID;T:WPA;P:MyPassword;;}
     *
     * @param ssid     Wi-Fi network name (SSID)
     * @param password Wi-Fi network password
     * @param security Wi-Fi encryption type (e.g. WPA, WEP, nopass)
     * @return Formatted Wi-Fi payload string
     */
    public String formatWifiPayload(String ssid, String password, String security) {
        if (ssid == null || ssid.isBlank()) {
            return "";
        }
        String secType = (security == null || security.isBlank()) ? "WPA" : security.trim().toUpperCase();
        if ("NONE".equalsIgnoreCase(secType) || "NOPASS".equalsIgnoreCase(secType)) {
            secType = "nopass";
        }

        StringBuilder sb = new StringBuilder("WIFI:");
        sb.append("S:").append(escapeWifiSpecialChars(ssid.trim())).append(";");
        sb.append("T:").append(secType).append(";");
        if (!"nopass".equalsIgnoreCase(secType) && password != null && !password.isBlank()) {
            sb.append("P:").append(escapeWifiSpecialChars(password)).append(";");
        }
        sb.append(";");
        return sb.toString();
    }

    /**
     * Builds a customer digital ordering URL for a specific table.
     *
     * @param clientBaseUrl Base establishment URL (e.g. https://openbar.lan)
     * @param tableNumero   Table number
     * @return Complete customer ordering URL (e.g. https://openbar.lan/client/commande?table=5)
     */
    public String buildTableOrderUrl(String clientBaseUrl, Integer tableNumero) {
        String base = (clientBaseUrl != null && !clientBaseUrl.isBlank())
            ? clientBaseUrl.trim()
            : "https://openbar.lan";

        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }

        int num = (tableNumero != null && tableNumero > 0) ? tableNumero : 1;
        return base + "/client/commande?table=" + num;
    }

    private BitMatrix encodeBitMatrix(String content, int width, int height) throws WriterException {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("QR code content cannot be null or empty");
        }
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
        hints.put(EncodeHintType.MARGIN, 1); // 1-module margin for compact badges

        int w = Math.max(width, 100);
        int h = Math.max(height, 100);
        return qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, w, h, hints);
    }

    private String escapeWifiSpecialChars(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("\\", "\\\\")
                   .replace(";", "\\;")
                   .replace(",", "\\,")
                   .replace(":", "\\:")
                   .replace("\"", "\\\"");
    }
}
