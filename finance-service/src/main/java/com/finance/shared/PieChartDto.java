package com.finance.shared;

import lombok.Builder;

import java.math.BigDecimal;
@Builder
public record PieChartDto(
        String label,
        String symbol,
        InstrumentType instrumentType,
        Currency currency,
        BigDecimal totalValue,
        BigDecimal percentage,
        Currency originalCurrency,
        BigDecimal originalValue,
        BigDecimal fxRateToDisplayCurrency
) {}
