package com.finance.shared;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.List;

/**
 * Data transfer object that carries yahoo chart response data.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record YahooChartResponse(Chart chart) {

    /**
     * Data transfer object that carries chart data.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Chart(List<Result> result) {}

    /**
     * Data transfer object that carries result data.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Result(
            Meta meta,
            List<Long> timestamp,
            Indicators indicators
    ) {}

    /**
     * Data transfer object that carries meta data.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Meta(
            String currency,
            Double regularMarketPrice
    ) {}

    /**
     * Data transfer object that carries indicators data.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Indicators(List<Quote> quote) {}

    /**
     * Data transfer object that carries quote data.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Quote(
            List<BigDecimal> close
    ) {}
}
