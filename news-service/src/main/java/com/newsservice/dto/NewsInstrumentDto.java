package com.newsservice.dto;

public record NewsInstrumentDto(
        String symbol,
        String assetType,
        String score,
        int rankOrder,
        boolean primaryMatch,
        String matchSource
) {
}
