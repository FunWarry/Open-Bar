package com.bar.gestioncocktail.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link InputSanitizer}.
 */
class InputSanitizerTest {

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\t\n"})
    @DisplayName("sanitize - returns null or trimmed empty string for null and blank input")
    void sanitize_nullAndBlank_handledSafely(String input) {
        String result = InputSanitizer.sanitize(input);
        if (input == null) {
            assertThat(result).isNull();
        } else {
            assertThat(result).isEmpty();
        }
    }

    @Test
    @DisplayName("sanitize - strips script tags and their content")
    void sanitize_scriptTag_removed() {
        String input = "<script>alert('XSS')</script>Mojito";
        assertThat(InputSanitizer.sanitize(input)).isEqualTo("Mojito");
    }

    @Test
    @DisplayName("sanitize - strips nested script tags")
    void sanitize_nestedScript_removed() {
        String input = "<<SCRIPT>alert(\"XSS\");//<</SCRIPT>Caipirinha";
        assertThat(InputSanitizer.sanitize(input)).doesNotContain("SCRIPT").doesNotContain("alert");
    }

    @Test
    @DisplayName("sanitize - strips img tag with onerror handler")
    void sanitize_imgOnError_removed() {
        String input = "<img src=x onerror=\"alert('XSS')\">Margarita";
        assertThat(InputSanitizer.sanitize(input)).isEqualTo("Margarita");
    }

    @Test
    @DisplayName("sanitize - strips iframe, style, svg and embed elements")
    void sanitize_dangerousElements_removed() {
        String input = "<iframe src='https://malicious.com'></iframe>" +
                "<style>body { display: none; }</style>" +
                "<svg onload='alert(1)'></svg>" +
                "<embed src='exploit.swf'>" +
                "Old Fashioned";

        assertThat(InputSanitizer.sanitize(input)).isEqualTo("Old Fashioned");
    }

    @Test
    @DisplayName("sanitize - strips javascript: pseudo-protocol from anchor tags")
    void sanitize_javascriptUrl_removed() {
        String input = "<a href=\"javascript:alert('pwned')\">Click for recipe</a>";
        assertThat(InputSanitizer.sanitize(input)).isEqualTo("Click for recipe");
    }

    @ParameterizedTest
    @CsvSource({
            "'Gin & Tonic', 'Gin & Tonic'",
            "'Mojito (Lime, Fresh Mint)', 'Mojito (Lime, Fresh Mint)'",
            "'5 < 10 degrees serving temp', '5 < 10 degrees serving temp'",
            "'100% Arabica Coffee', '100% Arabica Coffee'",
            "'Step 1: Shake well\nStep 2: Strain', 'Step 1: Shake well\nStep 2: Strain'"
    })
    @DisplayName("sanitize - preserves safe standard text, punctuation, and entities")
    void sanitize_safeText_preserved(String input, String expected) {
        assertThat(InputSanitizer.sanitize(input)).isEqualTo(expected);
    }
}
