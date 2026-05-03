package com.finance;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

import static org.junit.jupiter.api.Assertions.*;

class FinanceServiceApplicationTest {

    @Test
    void class_hasExpectedBootAnnotations() {
        assertTrue(FinanceServiceApplication.class.isAnnotationPresent(SpringBootApplication.class));
        assertTrue(FinanceServiceApplication.class.isAnnotationPresent(ConfigurationPropertiesScan.class));
        assertTrue(FinanceServiceApplication.class.isAnnotationPresent(EnableScheduling.class));
    }

    @Test
    void class_canBeInstantiated() {
        assertNotNull(new FinanceServiceApplication());
    }
}
