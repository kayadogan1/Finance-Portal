package com.finance.shared;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record FundHistoryResponse(
        @JsonProperty("t")
        List<Long> timestamps,

        @JsonProperty("c")
        List<BigDecimal> closes,

        @JsonProperty("s")
        String status
) {
}
