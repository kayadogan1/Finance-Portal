package com.finance.config;

import io.micrometer.observation.ObservationRegistry;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class ObservabilityConfigTest {

    @Test
    void observedAspect_returnsAspect() {
        ObservabilityConfig config = new ObservabilityConfig();

        assertNotNull(config.observedAspect(ObservationRegistry.create()));
    }
}
