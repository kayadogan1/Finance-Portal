package com.finance.shared;

import java.util.List;

public record ProviderStatusResponseDto(
        String service,
        List<ProviderStatusDto> providers
) {
}
