package com.apigateway.config;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OpenApiConfigTest {

    @Test
    void gatewayOpenAPIContainsServiceMetadata() {
        OpenAPI api = new OpenApiConfig().gatewayOpenAPI();

        assertEquals("Finance Portal API Gateway", api.getInfo().getTitle());
        assertEquals("v1.0", api.getInfo().getVersion());
    }
}
