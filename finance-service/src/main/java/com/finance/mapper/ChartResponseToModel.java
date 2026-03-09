package com.finance.mapper;

import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.shared.YahooChartResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ChartResponseToModel {

    public static List<MarketData> toMarketDataList(YahooChartResponse yahooChartResponse, Instrument instrument) {
        var result = yahooChartResponse.chart().result().getFirst();

        List<Long> timestamps = result.timestamp();
        if (timestamps == null || timestamps.isEmpty()) {
            return Collections.emptyList();
        }

        List<BigDecimal> closes = result.indicators().quote().getFirst().close();
        if (closes == null || closes.isEmpty()) {
            return Collections.emptyList();
        }

        List<MarketData> marketDataList = new ArrayList<>();
        for (int i = 0; i < timestamps.size(); i++) {
            BigDecimal price = closes.get(i);
            if (price == null) continue;

            LocalDateTime dateTime = Instant.ofEpochSecond(timestamps.get(i))
                    .atZone(ZoneId.systemDefault()).toLocalDateTime();

            marketDataList.add(MarketData.builder()
                    .price(price)
                    .timestamp(dateTime)
                    .instrument(instrument)
                    .build());
        }
        return marketDataList;
    }

}
