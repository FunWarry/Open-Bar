package com.bar.gestioncocktail.security;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.parser.Parser;
import org.jsoup.safety.Safelist;

/**
 * Utility service for sanitizing user-submitted text inputs against Cross-Site Scripting (XSS)
 * and malicious HTML/script injections.
 */
public final class InputSanitizer {

    private static final String DANGEROUS_ELEMENTS_SELECTOR =
            "script, style, iframe, object, embed, svg, link, meta, form, input, button, frame, frameset, applet, base";

    private static final String NEWLINE_PLACEHOLDER = "___OPENBAR_NEWLINE_PLACEHOLDER___";

    private InputSanitizer() {
        // Utility class
    }

    /**
     * Sanitizes a string by stripping all HTML markup, script elements, iframe containers,
     * inline event handlers (e.g., {@code onerror}, {@code onload}), and dangerous URI protocols.
     * Safe text content, standard entities, and multiline formatting are preserved.
     *
     * @param input Raw untrusted input string
     * @return Sanitized text string, or {@code null} if the input was {@code null}
     */
    public static String sanitize(String input) {
        if (input == null) {
            return null;
        }
        if (input.isBlank()) {
            return input.trim();
        }

        // 1. Preserve explicit newline characters across HTML processing
        String preserved = input.replace("\r\n", "\n").replace("\n", NEWLINE_PLACEHOLDER);

        // 2. Parse document and remove executable or embedded elements entirely
        Document document = Jsoup.parse(preserved);
        document.select(DANGEROUS_ELEMENTS_SELECTOR).remove();

        // 3. Clean any remaining markup using a strict empty safelist
        Document.OutputSettings outputSettings = new Document.OutputSettings()
                .prettyPrint(false);

        String cleanedHtml = Jsoup.clean(document.body().html(), "", Safelist.none(), outputSettings);

        // 4. Restore newlines and unescape safe standard HTML entities while trimming
        String restored = Parser.unescapeEntities(cleanedHtml, false)
                .replace(NEWLINE_PLACEHOLDER, "\n");

        return restored.trim();
    }
}
