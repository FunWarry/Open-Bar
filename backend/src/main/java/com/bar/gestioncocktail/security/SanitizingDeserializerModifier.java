package com.bar.gestioncocktail.security;

import com.fasterxml.jackson.databind.BeanDescription;
import com.fasterxml.jackson.databind.DeserializationConfig;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.deser.BeanDeserializerModifier;

/**
 * Jackson deserializer modifier that injects the {@link SanitizingStringDeserializer}
 * for all String types across DTOs and entity request payloads.
 */
public class SanitizingDeserializerModifier extends BeanDeserializerModifier {

    @Override
    public JsonDeserializer<?> modifyDeserializer(DeserializationConfig config,
                                                  BeanDescription beanDesc,
                                                  JsonDeserializer<?> deserializer) {
        if (beanDesc.getBeanClass() == String.class) {
            return new SanitizingStringDeserializer();
        }
        return super.modifyDeserializer(config, beanDesc, deserializer);
    }
}
