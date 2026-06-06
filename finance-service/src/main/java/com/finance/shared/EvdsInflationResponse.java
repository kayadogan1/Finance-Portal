package com.finance.shared;


import java.util.List;
/**
 * Data transfer object that carries evds inflation response data.
 */
public record EvdsInflationResponse(
        int totalCount,
        List<InflationItem> items
) {
}
