package com.finance.shared;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Data transfer object that carries buy or sell request dto data.
 */
public record BuyOrSellRequestDto(
        @NotNull UUID portfolioId,
        @NotBlank String instrumentSymbol,
        @Positive(message = "Miktar 0'dan büyük olmalı") BigDecimal quantity
) {}