package com.bar.gestioncocktail.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link SanitizingStringDeserializer} and {@link SanitizingDeserializerModifier}.
 */
class SanitizingStringDeserializerTest {

    private ObjectMapper objectMapper;

    static class SampleDto {
        private String name;
        private String notes;
        private String password;

        @NoSanitize
        private String apiKey;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }
    }

    record SampleRecord(
            String name,
            String notes,
            String password,
            @NoSanitize String secret
    ) {}

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        SimpleModule module = new SimpleModule();
        module.addDeserializer(String.class, new SanitizingStringDeserializer());
        module.setDeserializerModifier(new SanitizingDeserializerModifier());
        objectMapper.registerModule(module);
    }

    @Test
    @DisplayName("deserialize - automatically sanitizes standard text fields in JSON POJO")
    void deserialize_standardTextFields_sanitized() throws Exception {
        String json = """
                {
                    "name": "<script>alert(1)</script>Cosmopolitan",
                    "notes": "<img src=x onerror=alert(2)>Extra lime"
                }
                """;

        SampleDto dto = objectMapper.readValue(json, SampleDto.class);

        assertThat(dto.getName()).isEqualTo("Cosmopolitan");
        assertThat(dto.getNotes()).isEqualTo("Extra lime");
    }

    @Test
    @DisplayName("deserialize - automatically sanitizes standard text fields in JSON Java Record")
    void deserialize_recordTextFields_sanitized() throws Exception {
        String json = """
                {
                    "name": "<script>alert(1)</script>Negroni",
                    "notes": "<iframe src='evil.com'></iframe>Bitter and strong",
                    "password": "pass<word>123",
                    "secret": "tok_<abc>"
                }
                """;

        SampleRecord sampleRecord = objectMapper.readValue(json, SampleRecord.class);

        assertThat(sampleRecord.name()).isEqualTo("Negroni");
        assertThat(sampleRecord.notes()).isEqualTo("Bitter and strong");
        assertThat(sampleRecord.password()).isEqualTo("pass<word>123");
        assertThat(sampleRecord.secret()).isEqualTo("tok_<abc>");
    }

    @Test
    @DisplayName("deserialize - preserves raw sensitive fields like password and @NoSanitize fields")
    void deserialize_sensitiveFields_preservedRaw() throws Exception {
        String rawPassword = "P@ss<w0rd>#123!";
        String rawApiKey = "key_<secret_token_123>";

        String json = """
                {
                    "name": "Admin",
                    "password": "%s",
                    "apiKey": "%s"
                }
                """.formatted(rawPassword, rawApiKey);

        SampleDto dto = objectMapper.readValue(json, SampleDto.class);

        assertThat(dto.getName()).isEqualTo("Admin");
        assertThat(dto.getPassword()).isEqualTo(rawPassword);
        assertThat(dto.getApiKey()).isEqualTo(rawApiKey);
    }
}
