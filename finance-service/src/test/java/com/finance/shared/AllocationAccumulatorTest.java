package com.finance.shared;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AllocationAccumulatorTest {

    @Test
    void constructorWithDefaults_initializesZeroTotals() {
        AllocationAccumulator accumulator = new AllocationAccumulator("US Hisse", "US", InstrumentType.STOCK, Currency.USD);

        assertEquals(BigDecimal.ZERO, accumulator.displayValue());
        assertEquals(BigDecimal.ZERO, accumulator.originalValue());
        assertEquals(BigDecimal.ONE, accumulator.fxRateToDisplayCurrency());
    }

    @Test
    void add_returnsNewAccumulatorWithSummedValues() {
        AllocationAccumulator accumulator = new AllocationAccumulator("US Hisse", "US", InstrumentType.STOCK, Currency.USD);

        AllocationAccumulator updated = accumulator.add(
                new BigDecimal("150.50"),
                new BigDecimal("120.25"),
                new BigDecimal("40")
        );

        assertEquals(new BigDecimal("150.50"), updated.displayValue());
        assertEquals(new BigDecimal("120.25"), updated.originalValue());
        assertEquals(new BigDecimal("40"), updated.fxRateToDisplayCurrency());
    }
}
