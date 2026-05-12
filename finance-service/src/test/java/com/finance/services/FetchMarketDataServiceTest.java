package com.finance.services;

import com.finance.models.Instrument;
import com.finance.repositories.InstrumentRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import com.finance.config.InstrumentPropertiesConfig;
import com.finance.shared.Currency;
import com.finance.shared.InstrumentType;
import io.micrometer.tracing.CurrentTraceContext;
import io.micrometer.tracing.Tracer;
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
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FetchMarketDataServiceTest {

    @Mock private InstrumentPropertiesConfig instrumentProperties;
    @Mock private MarketDataPersistenceService persistenceService;
    @Mock private RestClient restClient;
    @Mock private InstrumentRepository instrumentRepository;
    @SuppressWarnings("rawtypes")
    @Mock private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;
    @Mock private RestClient.ResponseSpec responseSpec;
    @Mock private Tracer tracer;
    @Mock private CurrentTraceContext currentTraceContext;
    @Mock private FetchMarketDataService selfMock;

    @InjectMocks
    private FetchMarketDataService fetchMarketDataService;

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(fetchMarketDataService, "YAHOO_API_URL", "http://yahoo.com/{symbol}");
        ReflectionTestUtils.setField(fetchMarketDataService, "self", selfMock);

        when(tracer.currentTraceContext()).thenReturn(currentTraceContext);
        when(currentTraceContext.wrap(any(Runnable.class))).thenAnswer(inv -> inv.getArgument(0));

        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.header(anyString(), anyString())).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);
    }

    private JsonNode toJson(String raw) throws Exception {
        return jsonMapper.readTree(raw);
    }

    @Test
    void updateAllMarketData_whenConfigHasData_submitsTasksToSelf() {
        when(instrumentProperties.getStock()).thenReturn(Map.of("BIST", Map.of("THYAO", "THYAO.IS")));
        when(instrumentProperties.getForex()).thenReturn(Map.of("EURUSD", "EUR/USD"));
        when(instrumentProperties.getIndex()).thenReturn(Map.of());
        when(instrumentProperties.getCommodity()).thenReturn(Map.of());
        when(instrumentProperties.getBond()).thenReturn(Map.of());
        when(instrumentProperties.getFiat()).thenReturn(Map.of());
        when(instrumentRepository.findBySymbol("THYAO")).thenReturn(Optional.of(Instrument.builder()
                .symbol("THYAO")
                .name("Turk Hava Yollari")
                .type(InstrumentType.STOCK)
                .baseCurrency(Currency.TRY)
                .build()));

        fetchMarketDataService.updateAllMarketData();

        verify(selfMock).fetchAndSave("THYAO", "STOCK", Currency.TRY);
        verify(selfMock).fetchAndSave("EURUSD", "FOREX", null);
    }

    @Test
    void fetchAndSave_whenApiReturnsValidData_savesPrice() throws Exception {
        JsonNode body = toJson(
                "{ \"chart\": { \"result\": [ { \"meta\": { \"regularMarketPrice\": 150.5 } } ] } }");
        when(responseSpec.body(JsonNode.class)).thenReturn(body);

        fetchMarketDataService.fetchAndSave("AAPL", "STOCK", Currency.USD);

        verify(requestHeadersUriSpec).uri("http://yahoo.com/AAPL");
        verify(persistenceService).saveMarketData("AAPL", new BigDecimal("150.5"));
    }

    @Test
    void fetchAndSave_whenApiReturnsNoPrice_doesNotSave() throws Exception {
        JsonNode body = toJson(
                "{ \"chart\": { \"result\": [ { \"meta\": { } } ] } }");
        when(responseSpec.body(JsonNode.class)).thenReturn(body);

        fetchMarketDataService.fetchAndSave("AAPL", "STOCK", Currency.USD);

        verify(persistenceService, never()).saveMarketData(anyString(), any(BigDecimal.class));
    }

    @Test
    void fetchAndSave_whenApiThrowsException_catchesException() {
        when(responseSpec.body(JsonNode.class)).thenThrow(new RuntimeException("API error"));

        fetchMarketDataService.fetchAndSave("AAPL", "STOCK", Currency.USD);

        verify(persistenceService, never()).saveMarketData(anyString(), any(BigDecimal.class));
    }

    @Test
    void convertToYahooFormat_appliesCorrectFormatting() {
        assertEquals("EURUSD=X", fetchMarketDataService.convertToYahooFormat("EURUSD", "FOREX", null));
        assertEquals("BTC-USD", fetchMarketDataService.convertToYahooFormat("BTC", "CRYPTO", null));
        assertEquals("THYAO.IS", fetchMarketDataService.convertToYahooFormat("THYAO", "STOCK", Currency.TRY));
        assertEquals("AAPL", fetchMarketDataService.convertToYahooFormat("AAPL", "STOCK", Currency.USD));
        assertEquals("GC=F", fetchMarketDataService.convertToYahooFormat("GOLD", "COMMODITY", null));
        assertEquals("^GSPC", fetchMarketDataService.convertToYahooFormat("SPX", "INDEX", null));
        assertEquals("^TNX", fetchMarketDataService.convertToYahooFormat("US10Y", "BOND", null));
        assertEquals("DX-Y.NYB", fetchMarketDataService.convertToYahooFormat("USD", "FIAT", null));
        assertEquals("USDTRY=X", fetchMarketDataService.convertToYahooFormat("TRY", "FIAT", null));
        assertEquals("EURUSD=X", fetchMarketDataService.convertToYahooFormat("EUR", "FIAT", null));
    }

    @Test
    void parseYahooPrice_whenValidJson_returnsPrice() throws Exception {
        JsonNode json = toJson(
                "{ \"chart\": { \"result\": [ { \"meta\": { \"regularMarketPrice\": 150.5 } } ] } }");

        BigDecimal price = fetchMarketDataService.parseYahooPrice(json);

        assertEquals(new BigDecimal("150.5"), price);
    }

    @Test
    void parseYahooPrice_whenMissingResultArray_returnsNull() throws Exception {
        JsonNode json = toJson("{ \"invalid\": \"json\" }");

        assertNull(fetchMarketDataService.parseYahooPrice(json));
    }

    @Test
    void parseYahooPrice_whenEmptyResultArray_returnsNull() throws Exception {
        JsonNode json = toJson("{ \"chart\": { \"result\": [] } }");

        assertNull(fetchMarketDataService.parseYahooPrice(json));
    }

    @Test
    void parseYahooPrice_whenMissingRegularMarketPrice_returnsNull() throws Exception {
        JsonNode json = toJson(
                "{ \"chart\": { \"result\": [ { \"meta\": { } } ] } }");

        assertNull(fetchMarketDataService.parseYahooPrice(json));
    }

    @Test
    void formattingFunctions_testSpecificCodes() {
        assertEquals("SI=F", fetchMarketDataService.getCommodityCode("SILVER"));
        assertEquals("CL=F", fetchMarketDataService.getCommodityCode("OIL"));
        assertEquals("UNKNOWN=F", fetchMarketDataService.getCommodityCode("UNKNOWN"));

        assertEquals("^DJI", fetchMarketDataService.getIndexCode("DJI"));
        assertEquals("UNKNOWN", fetchMarketDataService.getIndexCode("UNKNOWN"));

        assertEquals("^TYX", fetchMarketDataService.getBondCode("US30Y"));
        assertEquals("UNKNOWN", fetchMarketDataService.getBondCode("UNKNOWN"));
    }
}
