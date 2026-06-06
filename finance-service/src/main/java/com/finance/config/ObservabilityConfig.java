package com.finance.config;

import io.micrometer.observation.ObservationRegistry;
import io.micrometer.observation.aop.ObservedAspect;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring configuration for observability.
 */
@Configuration
public class ObservabilityConfig {

    /**
     * Returns the result of observed aspect.
     *
     * @param observationRegistry observation registry value
     * @return observed aspect result
     */
    @Bean
    public ObservedAspect observedAspect(ObservationRegistry observationRegistry) {
        return new ObservedAspect(observationRegistry);
    }
}
