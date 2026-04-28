package com.finance.services;

import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import com.finance.shared.Currency;
import com.finance.shared.InstrumentType;
import com.finance.shared.YahooChartResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FetchFilteredInstrumentServiceTest {

    @Mock
    private MarketDataRepository marketDataRepository;

    @Mock
    private FetchMarketDataService fetchMarketDataService;

    @Mock
    private RestClient restClient;

    @Mock
    private InstrumentRepository instrumentRepository;

    @Mock
    private RedisCacheService redisCacheService;

    @SuppressWarnings("rawtypes")
    @Mock
    private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    @InjectMocks
    private FetchFilteredInstrumentService fetchFilteredInstrumentService;

    private Instrument dummyInstrument;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(fetchFilteredInstrumentService, "yahooApiUrl", "http://yahoo.com?symbol={symbol}&period1={period1}&period2={period2}");
        
        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.header(anyString(), anyString())).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);

        dummyInstrument = new Instrument();
        dummyInstrument.setSymbol("AAPL");
        dummyInstrument.setType(InstrumentType.STOCK);
        dummyInstrument.setBaseCurrency(Currency.USD);
        when(fetchMarketDataService.convertToYahooFormat("AAPL", "STOCK", Currency.USD)).thenReturn("AAPL");
    }

    private YahooChartResponse createValidResponse() {
        YahooChartResponse.Quote quote = new YahooChartResponse.Quote(List.of(new BigDecimal("150.0")));
        YahooChartResponse.Indicators indicators = new YahooChartResponse.Indicators(List.of(quote));
        YahooChartResponse.Result result = new YahooChartResponse.Result(null, List.of(Instant.now().getEpochSecond()), indicators);
        YahooChartResponse.Chart chart = new YahooChartResponse.Chart(List.of(result));
        return new YahooChartResponse(chart);
    }

    private YahooChartResponse createEmptyResponse() {
        YahooChartResponse.Result result = new YahooChartResponse.Result(null, List.of(), null);
        YahooChartResponse.Chart chart = new YahooChartResponse.Chart(List.of(result));
        return new YahooChartResponse(chart);
    }

    @Test
    void fetchInstrumentClosePrices_whenNewDataFound_savesToRepository() {
        // Arrange
        when(marketDataRepository.findFirstByInstrumentOrderByTimestampDesc(dummyInstrument)).thenReturn(Optional.empty());
        when(responseSpec.body(YahooChartResponse.class)).thenReturn(createValidResponse());
        
        // Act
        fetchFilteredInstrumentService.fetchInstrumentClosePricesSinceLastDate(dummyInstrument);

        // Assert
        verify(marketDataRepository).saveAll(anyList());
    }

    @Test
    void fetchInstrumentClosePrices_whenNoNewData_doesNotSave() {
        // Arrange
        when(marketDataRepository.findFirstByInstrumentOrderByTimestampDesc(dummyInstrument)).thenReturn(Optional.empty());
        when(responseSpec.body(YahooChartResponse.class)).thenReturn(createEmptyResponse());

        // Act
        fetchFilteredInstrumentService.fetchInstrumentClosePricesSinceLastDate(dummyInstrument);

        // Assert
        verify(marketDataRepository, never()).saveAll(anyList());
    }

    @Test
    void fetchInstrumentClosePrices_whenLastFetchIsTooRecent_skipsFetch() {
        // Arrange
        MarketData recentData = new MarketData();
        recentData.setTimestamp(LocalDateTime.now(ZoneOffset.UTC).minusMinutes(5)); // Less than 900 seconds
        
        when(marketDataRepository.findFirstByInstrumentOrderByTimestampDesc(dummyInstrument))
                .thenReturn(Optional.of(recentData));

        // Act
        fetchFilteredInstrumentService.fetchInstrumentClosePricesSinceLastDate(dummyInstrument);

        // Assert
        verify(restClient, never()).get(); // Should skip fetch
        verify(marketDataRepository, never()).saveAll(anyList());
    }

    @Test
    void fetchInstrumentClosePrices_whenApiThrowsException_throwsRestClientException() {
        // Arrange
        when(marketDataRepository.findFirstByInstrumentOrderByTimestampDesc(dummyInstrument)).thenReturn(Optional.empty());
        when(responseSpec.body(YahooChartResponse.class)).thenThrow(new RuntimeException("Connection error"));

        // Act & Assert
        assertThrows(org.springframework.web.client.RestClientException.class, () -> {
            fetchFilteredInstrumentService.fetchInstrumentClosePricesSinceLastDate(dummyInstrument);
        });
        verify(marketDataRepository, never()).saveAll(anyList());
    }
}
