package com.bar.gestioncocktail.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {

    private final int status;
    private final String error;
    private final String message;
    private final Instant timestamp;
    private final Map<String, String> fieldErrors;

    private ErrorResponse(Builder builder) {
        this.status = builder.status;
        this.error = builder.error;
        this.message = builder.message;
        this.timestamp = Instant.now();
        this.fieldErrors = builder.fieldErrors;
    }

    public int getStatus() { return status; }
    public String getError() { return error; }
    public String getMessage() { return message; }
    public Instant getTimestamp() { return timestamp; }
    public Map<String, String> getFieldErrors() { return fieldErrors; }

    public static Builder builder(int status, String error, String message) {
        return new Builder(status, error, message);
    }

    public static class Builder {
        private final int status;
        private final String error;
        private final String message;
        private Map<String, String> fieldErrors;

        private Builder(int status, String error, String message) {
            this.status = status;
            this.error = error;
            this.message = message;
        }

        public Builder fieldErrors(Map<String, String> fieldErrors) {
            this.fieldErrors = fieldErrors;
            return this;
        }

        public ErrorResponse build() {
            return new ErrorResponse(this);
        }
    }
}
