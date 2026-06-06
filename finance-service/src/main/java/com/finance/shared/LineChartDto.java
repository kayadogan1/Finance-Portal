package com.finance.shared;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Data transfer object that carries line chart dto data.
 */
public record LineChartDto(LocalDateTime dateTime, BigDecimal close) {

}
