package com.finance.shared;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Data transfer object that carries performance line chart dto data.
 */
public record PerformanceLineChartDto(LocalDate time , BigDecimal totalPrice) {

}
