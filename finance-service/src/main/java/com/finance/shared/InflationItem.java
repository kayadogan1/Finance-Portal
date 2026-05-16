package com.finance.shared;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record InflationItem(
        @JsonProperty("Tarih") String date,
        @JsonProperty("TP_FG_J0-3") Double rate
        ) {
}
