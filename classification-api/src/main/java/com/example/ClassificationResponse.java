package com.example;

import java.util.List;

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
