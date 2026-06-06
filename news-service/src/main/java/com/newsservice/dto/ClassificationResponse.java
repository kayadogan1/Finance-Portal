package com.newsservice.dto;

import java.util.List;

/**
 * Data transfer object that carries classification response data.
 */
public record ClassificationResponse(
        String headline,
        String assetType,
        String symbol,
        String assetScore,
        String symbolScore,
        String lexiconSymbol,
        List<String> topCandidates,
        boolean unknown,
        String modelVersion
) {
    /**
     * Returns the result of instrument symbol.
     *
     * @return instrument symbol result
     */
    public String instrumentSymbol() {
        return unknown || symbol == null || symbol.isBlank() ? null : symbol;
    }
}
