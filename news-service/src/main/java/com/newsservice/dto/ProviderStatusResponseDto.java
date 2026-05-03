package com.newsservice.dto;

import java.util.List;

public record ProviderStatusResponseDto(
        String service,
        List<ProviderStatusDto> providers
) {
}
