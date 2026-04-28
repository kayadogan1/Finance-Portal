package com.finance.shared;

import java.math.BigDecimal;

public record PieChartDto(
        String label,
        String symbol,
        InstrumentType instrumentType,
        Currency currency,
        BigDecimal totalValue,
        BigDecimal percentage
) {}

