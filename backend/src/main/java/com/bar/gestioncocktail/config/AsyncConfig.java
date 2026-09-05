package com.bar.gestioncocktail.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Configuration enabling asynchronous execution for event listeners and background notification tasks.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Dedicated executor for asynchronous application event processing and STOMP message broadcasting.
     *
     * @return Configured ThreadPoolTaskExecutor
     */
    @Bean(name = "openbarAsyncExecutor")
    public Executor openbarAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(16);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("openbar-async-");
        executor.initialize();
        return executor;
    }
}
