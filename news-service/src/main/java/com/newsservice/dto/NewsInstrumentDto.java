package com.newsservice.dto;

/**
 * Data transfer object that carries news instrument dto data.
 */
public record NewsInstrumentDto(
        String symbol,
        String assetType,
        String score,
        int rankOrder,
        boolean primaryMatch,
        String matchSource
) {
}
