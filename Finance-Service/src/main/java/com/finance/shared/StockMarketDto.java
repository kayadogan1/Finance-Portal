package com.finance.shared;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class StockMarketDto {
    private String symbol;
    private String companyName;
    private BigDecimal latestPrice;
    private boolean isActive;
}
