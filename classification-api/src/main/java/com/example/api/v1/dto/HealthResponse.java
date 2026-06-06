package com.example.api.v1.dto;

/**
 * Data transfer object that carries health response data.
 */
public record HealthResponse(String status, String service) {
}
