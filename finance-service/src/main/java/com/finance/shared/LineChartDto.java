package com.finance.shared;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record LineChartDto(LocalDateTime dateTime, BigDecimal close) {

}
