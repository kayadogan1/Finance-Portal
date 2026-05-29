package com.finance.shared;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
@Builder
public record PerformanceLineChartDtoWithInflationDto(
    LocalDate dateTime,
    BigDecimal portfolioValue,
    BigDecimal nominalCost,
    BigDecimal inflationAdjustedCost,
    BigDecimal inflationImpact,
    BigDecimal nominalReturn,
    BigDecimal realReturn,
    Double inflationRate,
    Currency currency
) {
}
