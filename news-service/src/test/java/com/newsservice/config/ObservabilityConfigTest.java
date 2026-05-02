package com.newsservice.config;

import io.micrometer.observation.ObservationRegistry;
import io.micrometer.observation.aop.ObservedAspect;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class ObservabilityConfigTest {

    @Test
    void observedAspect_createsBean() {
        ObservabilityConfig config = new ObservabilityConfig();

        ObservedAspect aspect = config.observedAspect(ObservationRegistry.create());

        assertNotNull(aspect);
    }
}
