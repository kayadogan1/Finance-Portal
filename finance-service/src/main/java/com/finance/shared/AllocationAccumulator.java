package com.finance.shared;

import java.math.BigDecimal;

public record AllocationAccumulator(
        String label,
        String marketCode,
        InstrumentType instrumentType,
        Currency originalCurrency,
        BigDecimal displayValue,
        BigDecimal originalValue,
        BigDecimal fxRateToDisplayCurrency
) {
    public AllocationAccumulator(String label, String marketCode, InstrumentType instrumentType, Currency originalCurrency) {
        this(label, marketCode, instrumentType, originalCurrency, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ONE);
    }

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
