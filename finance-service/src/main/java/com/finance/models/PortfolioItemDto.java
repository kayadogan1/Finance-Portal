package com.finance.models;

import java.math.BigDecimal;

public record PortfolioItemDto(
        String instrumentName,
        BigDecimal totalPrice

) {
}
