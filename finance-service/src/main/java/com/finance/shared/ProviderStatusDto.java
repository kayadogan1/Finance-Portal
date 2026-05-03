package com.finance.shared;

public record ProviderStatusDto(
        String key,
        String label,
        String state,
        String detail
) {
}
