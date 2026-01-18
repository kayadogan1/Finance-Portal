package com.finance.shared;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PolygonResult {
    @JsonProperty("T")
    private String ticker;
    @JsonProperty("c")
    private BigDecimal closerPrice;
}


