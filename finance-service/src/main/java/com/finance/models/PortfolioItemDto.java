package com.finance.models;

import java.math.BigDecimal;

/**
 * Data transfer object that carries portfolio item dto data.
 */
public record PortfolioItemDto(
        String instrumentName,
        BigDecimal totalPrice

) {
}
