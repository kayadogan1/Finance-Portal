package com.finance.shared;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
@Builder
public record PerformanceLineChartDtoWithInflationDto(
    LocalDate dateTime,
    BigDecimal portfolioValue,
    BigDecimal nominalReturn,
    Double inflationRate,
    BigDecimal realReturn
) {
}
