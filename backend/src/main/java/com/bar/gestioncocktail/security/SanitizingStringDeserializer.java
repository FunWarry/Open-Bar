package com.bar.gestioncocktail.security;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.BeanProperty;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.deser.ContextualDeserializer;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;

/**
 * Jackson string deserializer that automatically sanitizes incoming JSON string values
 * to protect against XSS and malicious markup injections.
 */
public class SanitizingStringDeserializer extends JsonDeserializer<String> implements ContextualDeserializer {

    private static final Set<String> SENSITIVE_FIELD_NAMES = Set.of(
            "password",
            "currentpassword",
            "newpassword",
            "confirmpassword",
            "token",
            "refreshtoken",
            "secret",
            "jwtsecret"
    );

    private final boolean shouldSanitize;

    /**
     * Default constructor enabling sanitization.
     */
    public SanitizingStringDeserializer() {
        this(true);
    }

    /**
     * Parameterized constructor for contextual instances.
     *
     * @param shouldSanitize Whether sanitization should be performed
     */
    public SanitizingStringDeserializer(boolean shouldSanitize) {
        this.shouldSanitize = shouldSanitize;
    }

    @Override
    public String deserialize(JsonParser parser, DeserializationContext ctxt) throws IOException {
        String value = parser.getValueAsString();
        if (!shouldSanitize || value == null) {
            return value;
        }
        return InputSanitizer.sanitize(value);
    }

    @Override
    public JsonDeserializer<?> createContextual(DeserializationContext ctxt, BeanProperty property) {
        if (property != null) {
            // Check for explicit @NoSanitize annotation on field or member
            if (property.getAnnotation(NoSanitize.class) != null ||
                    property.getContextAnnotation(NoSanitize.class) != null) {
                return new SanitizingStringDeserializer(false);
            }

            // Check if field name matches known credential and cryptographic property names
            String propertyName = property.getName();
            if (propertyName != null && SENSITIVE_FIELD_NAMES.contains(propertyName.toLowerCase(Locale.ROOT))) {
                return new SanitizingStringDeserializer(false);
            }
        }
        return this;
    }
}
