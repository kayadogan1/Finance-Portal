package com.finance.shared;


import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Data transfer object that carries candle dto data.
 */
public record CandleDto (
        LocalDateTime time,
        BigDecimal open,
        BigDecimal high,
        BigDecimal low,
        BigDecimal close

){}
