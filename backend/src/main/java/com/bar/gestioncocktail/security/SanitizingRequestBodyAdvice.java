package com.bar.gestioncocktail.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;

import java.lang.reflect.Type;

/**
 * Controller advice that intercepts incoming HTTP request bodies and ensures automated
 * XSS and HTML input sanitization is systematically applied across all request DTOs.
 */
@ControllerAdvice
public class SanitizingRequestBodyAdvice extends RequestBodyAdviceAdapter {

    private final ObjectMapper objectMapper;

    /**
     * Constructs the advice with the application's sanitizing {@link ObjectMapper}.
     *
     * @param objectMapper Sanitizing Jackson object mapper
     */
    public SanitizingRequestBodyAdvice(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean supports(MethodParameter methodParameter,
                            Type targetType,
                            Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object afterBodyRead(Object body,
                                HttpInputMessage inputMessage,
                                MethodParameter parameter,
                                Type targetType,
                                Class<? extends HttpMessageConverter<?>> converterType) {
        if (body == null) {
            return null;
        }

        try {
            String json = objectMapper.writeValueAsString(body);
            if (targetType instanceof Class<?> clazz) {
                return objectMapper.readValue(json, clazz);
            }
            return objectMapper.readValue(json, objectMapper.constructType(targetType));
        } catch (Exception _) {
            return body;
        }
    }
}
