package com.example.api.v1.dto;

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
        String modelVersion) {
}
