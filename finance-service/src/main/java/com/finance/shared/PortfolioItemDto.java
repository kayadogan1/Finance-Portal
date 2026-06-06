package com.finance.shared;

import java.math.BigDecimal;

/**
 * Data transfer object that carries portfolio item dto data.
 */
public record PortfolioItemDto(
        InstrumentDto instrumentDto,
        BigDecimal amount,
        BigDecimal averageCost,
        BigDecimal currentValue,
        BigDecimal costValue,
        BigDecimal profitLoss,
        BigDecimal profitLossPercent,
        InstrumentType instrumentType,
        Currency displayCurrency,
        BigDecimal fxRateToDisplayCurrency
) {
}
