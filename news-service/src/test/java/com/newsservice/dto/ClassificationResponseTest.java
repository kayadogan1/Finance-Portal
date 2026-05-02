package com.newsservice.dto;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ClassificationResponseTest {

    @Test
    void instrumentSymbol_returnsNullWhenUnknown() {
        ClassificationResponse response = new ClassificationResponse(
                "headline",
                "STOCK",
                "AAPL",
                "0.9",
                "0.9",
                null,
                List.of(),
                true,
                "v1"
        );

        assertNull(response.instrumentSymbol());
    }

    @Test
    void instrumentSymbol_returnsSymbolWhenKnown() {
        ClassificationResponse response = new ClassificationResponse(
                "headline",
                "STOCK",
                "AAPL",
                "0.9",
                "0.9",
                null,
                List.of(),
                false,
                "v1"
        );

        assertEquals("AAPL", response.instrumentSymbol());
    }
}
