package com.finance.shared;


import java.util.List;
public record EvdsInflationResponse(
        int totalCount,
        List<InflationItem> items
) {
}
