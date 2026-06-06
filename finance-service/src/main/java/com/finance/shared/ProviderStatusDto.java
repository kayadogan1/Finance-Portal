package com.finance.shared;

/**
 * Data transfer object that carries provider status dto data.
 */
public record ProviderStatusDto(
        String key,
        String label,
        String state,
        String detail
) {
}
