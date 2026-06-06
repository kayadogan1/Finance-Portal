package com.finance.shared;

import lombok.Builder;

import java.math.BigDecimal;
/**
 * Data transfer object that carries pie chart dto data.
 */
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
