package com.example.api.error;

/**
 * Data transfer object that carries error response data.
 */
public record ErrorResponse(String code, String message) {
}
