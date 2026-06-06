package com.finance.shared;

import java.math.BigDecimal;

/**
 * Data transfer object that carries allocation accumulator data.
 */
public record AllocationAccumulator(
        String label,
        String marketCode,
        InstrumentType instrumentType,
        Currency originalCurrency,
        BigDecimal displayValue,
        BigDecimal originalValue,
        BigDecimal fxRateToDisplayCurrency
) {
    /**
     * Creates a new AllocationAccumulator with its required dependencies.
     *
     * @param label label value
     * @param marketCode market code value
     * @param instrumentType instrument type value
     * @param originalCurrency original currency value
     */
    public AllocationAccumulator(String label, String marketCode, InstrumentType instrumentType, Currency originalCurrency) {
        this(label, marketCode, instrumentType, originalCurrency, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ONE);
    }

    /**
     * Returns the result of add.
     *
     * @param displayValue display value value
     * @param originalValue original value value
     * @param fxRateToDisplayCurrency fx rate to display currency value
     * @return add result
     */
    public AllocationAccumulator add(BigDecimal displayValue, BigDecimal originalValue, BigDecimal fxRateToDisplayCurrency) {
        return new AllocationAccumulator(
                label,
                marketCode,
                instrumentType,
                originalCurrency,
                this.displayValue.add(displayValue),
                this.originalValue.add(originalValue),
                fxRateToDisplayCurrency
        );
    }
}
