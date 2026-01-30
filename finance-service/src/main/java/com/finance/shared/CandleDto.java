package com.finance.shared;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public record CandleDto (
        LocalDateTime time,
        BigDecimal open,
        BigDecimal high,
        BigDecimal low,
        BigDecimal close

){}
