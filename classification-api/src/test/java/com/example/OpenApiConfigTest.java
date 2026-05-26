package com.example;

import io.swagger.v3.oas.models.OpenAPI;
import junit.framework.TestCase;

public class OpenApiConfigTest extends TestCase {

    public void testClassificationOpenAPIContainsServiceMetadata() {
        OpenAPI api = new OpenApiConfig().classificationOpenAPI();

        assertEquals("Finance Portal Classification API", api.getInfo().getTitle());
        assertEquals("v1.0", api.getInfo().getVersion());
    }
}
