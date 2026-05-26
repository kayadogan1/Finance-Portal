package com.newsservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OpenApiConfigTest {

    @Test
    void newsOpenAPIContainsServiceMetadata() {
        OpenAPI api = new OpenApiConfig().newsOpenAPI();

        assertEquals("Finance Portal News API", api.getInfo().getTitle());
        assertEquals("v1.0", api.getInfo().getVersion());
    }
}
