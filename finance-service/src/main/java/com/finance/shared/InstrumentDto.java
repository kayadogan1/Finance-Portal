package com.finance.shared;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

/**
 * Data transfer object that represents instrument data.
 */
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

    private LocalDateTime lastUpdateTime;

    private boolean historicalDataLoaded;

    private boolean active;

    private BigDecimal changeValue;

    private BigDecimal changePercent;

    /**
     * Creates a new InstrumentDto with its required dependencies.
     *
     * @param symbol instrument symbol used to locate market data
     * @param name name value
     * @param instrumentType instrument type value
     * @param currentPrice current price value
     * @param previousPrice previous price value
     * @param baseCurrency base currency value
     * @param market market value
     * @param lastUpdateTime last update time value
     * @param active active value
     * @param historicalDataLoaded historical data loaded value
     */
    public InstrumentDto(
            String symbol,
            String name,
            InstrumentType instrumentType,
            BigDecimal currentPrice,
            BigDecimal previousPrice,
            Currency baseCurrency,
            String market,
            LocalDateTime lastUpdateTime,
            boolean active,
            boolean historicalDataLoaded
    ) {
        this.symbol = symbol;
        this.name = name;
        this.instrumentType = instrumentType;
        this.currentPrice = currentPrice;
        this.previousPrice = previousPrice;
        this.baseCurrency = baseCurrency;
        this.market = market;
        this.lastUpdateTime = lastUpdateTime;
        this.active = active;
        this.historicalDataLoaded = historicalDataLoaded;

        calculateChangeFields();
    }

    /**
     * Calculates change fields.
     */
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
