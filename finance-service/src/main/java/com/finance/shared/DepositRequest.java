package com.finance.shared;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public class DepositRequest {

    @NotNull
    public UUID portfolioId;
    @Positive
    public BigDecimal amount;
}
