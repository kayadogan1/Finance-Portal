package com.finance.shared;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public class BuyOrSellRequestDto {

    @NotNull
    public UUID portfolioId;
    @NotBlank
    public String instrumentSymbol;
    @Positive(message = "Miktar 0'dan büyük olmalı")
    public BigDecimal quantity;
}
