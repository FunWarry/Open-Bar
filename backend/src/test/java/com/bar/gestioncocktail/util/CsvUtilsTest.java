package com.bar.gestioncocktail.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CsvUtilsTest {

    @Test
    @DisplayName("sanitizeFormula returns empty string for null input")
    void sanitizeFormula_nullReturnsEmpty() {
        assertThat(CsvUtils.sanitizeFormula(null)).isEmpty();
    }

    @Test
    @DisplayName("sanitizeFormula preserves benign strings unchanged")
    void sanitizeFormula_benignStringUnchanged() {
        assertThat(CsvUtils.sanitizeFormula("Mojito")).isEqualTo("Mojito");
        assertThat(CsvUtils.sanitizeFormula("123.45")).isEqualTo("123.45");
        assertThat(CsvUtils.sanitizeFormula("Hello World!")).isEqualTo("Hello World!");
    }

    @ParameterizedTest
    @ValueSource(strings = {"=SUM(A1:A10)", "+cmd|' /C calc'!A0", "-1+1", "@calc", "\tcmd", "\rcalc"})
    @DisplayName("sanitizeFormula prefixes dangerous formula characters with single quote")
    void sanitizeFormula_dangerousPrefixesPrefixed(String dangerous) {
        String sanitized = CsvUtils.sanitizeFormula(dangerous);
        assertThat(sanitized)
                .startsWith("'")
                .isEqualTo("'" + dangerous);
    }

    @Test
    @DisplayName("sanitizeFormula handles strings with leading whitespace before formula characters")
    void sanitizeFormula_leadingWhitespaceWithFormulaChar() {
        String input = "   =cmd|' /C calc'!A0";
        String sanitized = CsvUtils.sanitizeFormula(input);
        assertThat(sanitized).isEqualTo("'" + input);
    }

    @Test
    @DisplayName("escapeCell handles null values by returning empty string")
    void escapeCell_nullReturnsEmpty() {
        assertThat(CsvUtils.escapeCell(null)).isEmpty();
        assertThat(CsvUtils.escapeCell(null, ",")).isEmpty();
    }

    @Test
    @DisplayName("escapeCell leaves plain alphanumeric text unquoted")
    void escapeCell_plainTextUnquoted() {
        assertThat(CsvUtils.escapeCell("Cocktail")).isEqualTo("Cocktail");
        assertThat(CsvUtils.escapeCell(42)).isEqualTo("42");
    }

    @Test
    @DisplayName("escapeCell quotes cells containing the delimiter")
    void escapeCell_containsDelimiterQuoted() {
        assertThat(CsvUtils.escapeCell("Gin; Tonic")).isEqualTo("\"Gin; Tonic\"");
        assertThat(CsvUtils.escapeCell("Gin, Tonic", ",")).isEqualTo("\"Gin, Tonic\"");
    }

    @Test
    @DisplayName("escapeCell doubles internal quotes and wraps cell in quotes")
    void escapeCell_internalQuotesDoubled() {
        assertThat(CsvUtils.escapeCell("Cocktail \"Special\" Bar"))
                .isEqualTo("\"Cocktail \"\"Special\"\" Bar\"");
    }

    @Test
    @DisplayName("escapeCell quotes cells containing newline or carriage return")
    void escapeCell_newlinesQuoted() {
        assertThat(CsvUtils.escapeCell("Line 1\nLine 2")).isEqualTo("\"Line 1\nLine 2\"");
        assertThat(CsvUtils.escapeCell("Line 1\rLine 2")).isEqualTo("\"Line 1\rLine 2\"");
    }

    @Test
    @DisplayName("escapeCell sanitizes and quotes formula injection cells")
    void escapeCell_formulaInjectionSanitizedAndQuoted() {
        String formula = "=1+1";
        // sanitizeFormula yields '=1+1, which starts with ' so escapeCell quotes it
        assertThat(CsvUtils.escapeCell(formula)).isEqualTo("\"'=1+1\"");
    }

    @Test
    @DisplayName("formatRow formats list of items with semicolon by default")
    void formatRow_defaultDelimiter() {
        List<Object> row = List.of("INV-001", "Table 1", 42.50, "=2+2");
        String result = CsvUtils.formatRow(row);
        assertThat(result).isEqualTo("INV-001;Table 1;42.5;\"'=2+2\"\n");
    }

    @Test
    @DisplayName("formatRow supports custom delimiter such as comma")
    void formatRow_customDelimiter() {
        List<Object> row = List.of("INV-001", "Table, 1", 42.50);
        String result = CsvUtils.formatRow(row, ",");
        assertThat(result).isEqualTo("INV-001,\"Table, 1\",42.5\n");
    }

    @Test
    @DisplayName("formatRow handles empty or null list gracefully")
    void formatRow_emptyOrNullList() {
        assertThat(CsvUtils.formatRow(null)).isEqualTo("\n");
        assertThat(CsvUtils.formatRow(List.of())).isEqualTo("\n");
    }
}
