package com.finance.shared;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;

@NoArgsConstructor
@Getter
public class InstrumentDto {

    private String symbol;

    private String name;

    private InstrumentType instrumentType;

    private BigDecimal currentPrice;

    private BigDecimal previousPrice;

    private Currency baseCurrency;

    private String market;

    private BigDecimal changeValue;

    private BigDecimal changePercent;

    public InstrumentDto(
            String symbol,
            String name,
            InstrumentType instrumentType,
            BigDecimal currentPrice,
            BigDecimal previousPrice,
            Currency baseCurrency,
            String market
    ) {
        this.symbol = symbol;
        this.name = name;
        this.instrumentType = instrumentType;
        this.currentPrice = currentPrice;
        this.previousPrice = previousPrice;
        this.baseCurrency = baseCurrency;
        this.market = market;

        calculateChangeFields();
    }

    private void calculateChangeFields() {
        if (currentPrice == null || previousPrice == null || previousPrice.compareTo(BigDecimal.ZERO) == 0) {
            this.changeValue = null;
            this.changePercent = null;
            return;
        }

        this.changeValue = currentPrice.subtract(previousPrice);

        this.changePercent = this.changeValue
                .multiply(BigDecimal.valueOf(100))
                .divide(previousPrice, 2, RoundingMode.HALF_UP);
    }
}
