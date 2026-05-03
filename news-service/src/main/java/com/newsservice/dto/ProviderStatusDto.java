package com.newsservice.dto;

public record ProviderStatusDto(
        String key,
        String label,
        String state,
        String detail
) {
}
