package com.finance.shared;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
@NoArgsConstructor
@AllArgsConstructor
public class InstrumentDto {

    private String symbol;

    private String name;

    private InstrumentType instrumentType;

    private BigDecimal currentPrice;


}
