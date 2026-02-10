package com.finance.shared;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public class DepositRequest {

    @NotBlank
    public UUID portfolioId;
    @Positive
    public BigDecimal amount;
}
