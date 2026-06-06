package com.finance.shared;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Data transfer object that represents stock market data.
 */
@Data
@Builder
public class StockMarketDto {
    private String symbol;
    private String companyName;
    private BigDecimal latestPrice;
    private boolean isActive;
}
