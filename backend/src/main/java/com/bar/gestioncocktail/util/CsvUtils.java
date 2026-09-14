package com.bar.gestioncocktail.util;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Utility for RFC 4180 compliant CSV generation, cell escaping, and formula injection protection.
 */
public final class CsvUtils {

    /** Default European delimiter for Excel compatibility. */
    public static final String DEFAULT_DELIMITER = ";";

    /** Byte Order Mark (BOM) for UTF-8 encoding in Excel. */
    public static final String UTF8_BOM = "\uFEFF";

    private CsvUtils() {
        // Utility class
    }

    /**
     * Sanitizes string values to prevent CSV formula injection (DDE attacks) in Microsoft Excel and LibreOffice.
     * Prefixes dangerous leading characters (=, +, -, @, \t, \r) with a single quote (').
     *
     * @param value the raw text value
     * @return sanitized value safe from formula execution
     */
    public static String sanitizeFormula(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        char rawFirst = value.charAt(0);
        if (rawFirst == '=' || rawFirst == '+' || rawFirst == '-' || rawFirst == '@' || rawFirst == '\t' || rawFirst == '\r') {
            return "'" + value;
        }
        String trimmed = value.stripLeading();
        if (!trimmed.isEmpty()) {
            char first = trimmed.charAt(0);
            if (first == '=' || first == '+' || first == '-' || first == '@') {
                return "'" + value;
            }
        }
        return value;
    }

    /**
     * Escapes a single cell according to RFC 4180 rules with optional formula injection protection.
     *
     * @param value the cell object value
     * @param delimiter the CSV column delimiter
     * @return escaped and sanitized cell string
     */
    public static String escapeCell(Object value, String delimiter) {
        if (value == null) {
            return "";
        }
        String str = sanitizeFormula(value.toString());
        boolean needsQuotes = str.contains(delimiter)
                || str.contains("\"")
                || str.contains("\n")
                || str.contains("\r")
                || str.startsWith("'");

        if (needsQuotes) {
            return "\"" + str.replace("\"", "\"\"") + "\"";
        }
        return str;
    }

    /**
     * Escapes a single cell using the default semicolon delimiter.
     *
     * @param value the cell object value
     * @return escaped and sanitized cell string
     */
    public static String escapeCell(Object value) {
        return escapeCell(value, DEFAULT_DELIMITER);
    }

    /**
     * Formats a list of cell values into a single CSV row with proper escaping.
     *
     * @param values the list of cell values
     * @param delimiter the CSV column delimiter
     * @return formatted row ending with standard newline (\n)
     */
    public static String formatRow(List<?> values, String delimiter) {
        if (values == null || values.isEmpty()) {
            return "\n";
        }
        return values.stream()
                .map(v -> escapeCell(v, delimiter))
                .collect(Collectors.joining(delimiter)) + "\n";
    }

    /**
     * Formats a list of cell values into a single CSV row using default delimiter.
     *
     * @param values the list of cell values
     * @return formatted row ending with standard newline (\n)
     */
    public static String formatRow(List<?> values) {
        return formatRow(values, DEFAULT_DELIMITER);
    }
}
