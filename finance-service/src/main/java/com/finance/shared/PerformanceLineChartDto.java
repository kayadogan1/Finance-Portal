package com.finance.shared;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PerformanceLineChartDto(LocalDate time , BigDecimal totalPrice) {

}
