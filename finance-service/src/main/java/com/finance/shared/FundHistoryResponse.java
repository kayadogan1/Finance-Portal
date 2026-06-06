package com.finance.shared;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;
/**
 * Data transfer object that carries fund history response data.
 */
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
