package com.finance.mapper;

import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.shared.YahooChartResponse;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ChartResponseToModelTest {

    @Test
    void toMarketDataList_whenValidResponse_mapsCorrectly() {
        // Arrange
        Instrument instrument = new Instrument();
        long now = Instant.now().getEpochSecond();
        
        YahooChartResponse.Quote quote = new YahooChartResponse.Quote(List.of(new BigDecimal("150.0")));
        YahooChartResponse.Indicators indicators = new YahooChartResponse.Indicators(List.of(quote));
        YahooChartResponse.Result result = new YahooChartResponse.Result(null, List.of(now), indicators);
        YahooChartResponse.Chart chart = new YahooChartResponse.Chart(List.of(result));
        YahooChartResponse response = new YahooChartResponse(chart);

        // Act
        List<MarketData> marketDataList = ChartResponseToModel.toMarketDataList(response, instrument);

        // Assert
        assertEquals(1, marketDataList.size());
        assertEquals(new BigDecimal("150.0"), marketDataList.get(0).getPrice());
        assertEquals(instrument, marketDataList.get(0).getInstrument());
    }

    @Test
    void toMarketDataList_whenTimestampsNull_returnsEmptyList() {
        // Arrange
        YahooChartResponse.Result result = new YahooChartResponse.Result(null, null, null);
        YahooChartResponse.Chart chart = new YahooChartResponse.Chart(List.of(result));
        YahooChartResponse response = new YahooChartResponse(chart);

        // Act
        List<MarketData> resultList = ChartResponseToModel.toMarketDataList(response, new Instrument());

        // Assert
        assertTrue(resultList.isEmpty());
    }

    @Test
    void toMarketDataList_whenClosesNull_returnsEmptyList() {
        // Arrange
        YahooChartResponse.Quote quote = new YahooChartResponse.Quote(null);
        YahooChartResponse.Indicators indicators = new YahooChartResponse.Indicators(List.of(quote));
        YahooChartResponse.Result result = new YahooChartResponse.Result(null, List.of(123L), indicators);
        YahooChartResponse.Chart chart = new YahooChartResponse.Chart(List.of(result));
        YahooChartResponse response = new YahooChartResponse(chart);

        // Act
        List<MarketData> resultList = ChartResponseToModel.toMarketDataList(response, new Instrument());

        // Assert
        assertTrue(resultList.isEmpty());
    }
}
