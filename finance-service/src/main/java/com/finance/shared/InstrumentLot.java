package com.finance.shared;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
@Builder
@Getter
@Setter
public class InstrumentLot {
    String symbol;
    Currency currency;
    BigDecimal remainingQuantity;
    BigDecimal buyPrice;
    LocalDate buyDate;
}
