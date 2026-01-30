package com.finance.shared;


import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CandleDto (
        LocalDateTime time,
        BigDecimal open,
        BigDecimal high,
        BigDecimal low,
        BigDecimal close

){}
