package com.finance.shared;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PortfolioDto(

        @NotBlank(message = "Portfolio name cannot be blank")
        @Size(min = 3, max = 50, message = "Portfolio name must be between 3 and 50 characters")
        String portfolioName,

        @NotNull(message = "Risk tolerance is required")
        RiskTolerance riskTolerance,

        @NotNull(message = "Portfolio purpose is required")
        PortfolioPurposeType purpose,

        @Valid
        List<PortfolioItemDto> portfolioItems

) {
}
