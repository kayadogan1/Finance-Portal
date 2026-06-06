package com.finance.shared;

import lombok.Data;

/**
 * Data transfer object that represents binance response data.
 */
@Data
public class BinanceResponseDto {
    private String symbol;
    private String price;
}
