package com.bar.gestioncocktail.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation used on DTO fields or parameters to bypass automatic HTML/XSS input sanitization.
 * <p>
 * This is primarily intended for credential fields (e.g., passwords, secret keys, cryptographic tokens)
 * where special characters such as {@code <} or {@code >} are valid password components and must not be altered.
 */
@Documented
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface NoSanitize {
}
