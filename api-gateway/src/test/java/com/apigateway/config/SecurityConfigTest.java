package com.apigateway.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.server.ServerWebExchange;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecurityConfigTest {

    @Test
    void corsConfigurationSource_allowsFrontendOriginAndApiMethods() {
        CorsConfigurationSource source = new SecurityConfig().corsConfigurationSource();
        ServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/market").build());

        CorsConfiguration configuration = source.getCorsConfiguration(exchange);

        assertNotNull(configuration);
        assertEquals(List.of("http://localhost:5173"), configuration.getAllowedOrigins());
        assertTrue(configuration.getAllowedMethods().containsAll(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")));
        assertEquals(List.of("Authorization", "Content-Type"), configuration.getAllowedHeaders());
        assertEquals(Boolean.TRUE, configuration.getAllowCredentials());
    }
}
