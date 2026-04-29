package com.finance.shared;

import java.math.BigDecimal;

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
