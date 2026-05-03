package com.finance.shared;

import java.math.BigDecimal;

public record PortfolioCurrentProfitDto(
        String label,
        String symbol,
        InstrumentType instrumentType,
        Currency instrumentCurrency,
        Currency displayCurrency,
        BigDecimal quantity,
        BigDecimal averageCost,
        BigDecimal currentPrice,
        BigDecimal costValue,
        BigDecimal currentValue,
        BigDecimal profitLoss,
        BigDecimal profitLossPercent,
        BigDecimal fxRateToDisplayCurrency
) {
}
