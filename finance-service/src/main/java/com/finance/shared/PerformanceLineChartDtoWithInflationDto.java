package com.finance.shared;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
/**
 * Data transfer object that carries performance line chart dto with inflation dto data.
 */
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
