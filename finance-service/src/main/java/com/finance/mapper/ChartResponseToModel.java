package com.finance.mapper;

import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.shared.YahooChartResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

public class ChartResponseToModel {

    public static List<MarketData> toMarketDataList(YahooChartResponse yahooChartResponse, Instrument instrument) {
        var result = yahooChartResponse.chart().result().getFirst();
        List<Long> timestamps = result.timestamp();
        List<BigDecimal> closes = result.indicators().quote().getFirst().close();
        List<MarketData> marketDataList = new ArrayList<>();
        for (int i=0; i<timestamps.size(); i++) {

            LocalDateTime dateTime = Instant.ofEpochSecond(timestamps.get(i))
                    .atZone(ZoneId.systemDefault()).toLocalDateTime();
            MarketData marketData = MarketData.builder()
                    .price(closes.get(i))
                    .timestamp(dateTime)
                    .instrument(instrument)
                    .build();
            marketDataList.add(marketData);
        }
        return marketDataList;

    }

}
