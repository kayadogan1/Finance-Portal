package com.finance.shared;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record HypotheticalReturnDto(
        String symbol,
        String name,
        InstrumentType instrumentType,
        Currency instrumentCurrency,
        Currency displayCurrency,
        LocalDate purchaseDate,
        LocalDateTime executedAt,
        BigDecimal quantity,
        BigDecimal purchasePrice,
        BigDecimal currentPrice,
        BigDecimal costValue,
        BigDecimal currentValue,
        BigDecimal profitLoss,
        BigDecimal profitLossPercent,
        BigDecimal fxRateToDisplayCurrency
) {
}
