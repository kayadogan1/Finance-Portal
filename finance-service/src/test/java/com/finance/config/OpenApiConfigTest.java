package com.finance.config;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OpenApiConfigTest {

    @Test
    void financeOpenAPI_returnsConfiguredMetadata() {
        OpenAPI api = new OpenApiConfig().financeOpenAPI();

        assertNotNull(api);
        assertEquals("Finance Portfolio API", api.getInfo().getTitle());
        assertEquals("v2.0", api.getInfo().getVersion());
        assertEquals("Lead Developer", api.getInfo().getContact().getName());
    }
}
