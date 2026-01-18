package com.finance.shared;

import lombok.Data;

@Data
public class BinanceResponseDto {
    private String symbol;
    private String price;
}
