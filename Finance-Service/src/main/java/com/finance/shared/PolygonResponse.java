package com.finance.shared;

import lombok.Data;

import java.util.List;
@Data
public class PolygonResponse {
    private int resultsCount;
    private List<PolygonResult> results;

}
