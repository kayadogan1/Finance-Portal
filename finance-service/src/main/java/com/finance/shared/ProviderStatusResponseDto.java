package com.finance.shared;

import java.util.List;

/**
 * Data transfer object that carries provider status response dto data.
 */
public record ProviderStatusResponseDto(
        String service,
        List<ProviderStatusDto> providers
) {
}
