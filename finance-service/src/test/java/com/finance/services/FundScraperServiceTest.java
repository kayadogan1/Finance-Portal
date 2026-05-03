package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import com.finance.shared.Currency;
import com.finance.shared.FundHistoryResponse;
import com.finance.shared.InstrumentType;
import io.micrometer.tracing.CurrentTraceContext;
import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FundScraperServiceTest {

    @Mock
    private MarketDataPersistenceService marketDataPersistenceService;

    @Mock
    private RestClient restClient;

    @Mock
    private MarketDataRepository marketDataRepository;

    @Mock
    private InstrumentRepository instrumentRepository;

    @Mock
    private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RestClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    @Mock
    private Tracer tracer;

    @Mock
    private CurrentTraceContext currentTraceContext;

    @Mock
    private Span span;

    @Mock
    private Tracer.SpanInScope spanInScope;

    private FundScraperService fundScraperService;

    @BeforeEach
    void setUp() {
        InstrumentPropertiesConfig propertiesConfig = new InstrumentPropertiesConfig();
        propertiesConfig.setFund(Map.of("TCD", "Test Fund", "F_TEST", "Test Fund 2"));
        propertiesConfig.setViop(Map.of("F_SISE", "Sise Viop"));

        fundScraperService = new FundScraperService(
                marketDataPersistenceService,
                restClient,
                propertiesConfig,
                marketDataRepository,
                instrumentRepository,
                tracer
        );
        ReflectionTestUtils.setField(fundScraperService, "API_URL", "http://example.test/history");

        when(tracer.nextSpan()).thenReturn(span);
        when(tracer.nextSpan(any(Span.class))).thenReturn(span);
        when(tracer.withSpan(any(Span.class))).thenReturn(spanInScope);
        when(span.name(anyString())).thenReturn(span);
        when(span.tag(anyString(), anyString())).thenReturn(span);
        when(span.start()).thenReturn(span);
        when(tracer.currentTraceContext()).thenReturn(currentTraceContext);
        when(currentTraceContext.wrap(any(Runnable.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void scrapeFunds_whenConfiguredInstrumentsExist_submitsTasksAndProcessesThem() {
        Instrument fund = createInstrument("TCD");
        Instrument extraFund = createInstrument("F_TEST");
        Instrument viop = createInstrument("F_SISE");
        MarketData latest = new MarketData();
        latest.setTimestamp(LocalDate.now().atStartOfDay());

        when(instrumentRepository.findInstrumentBySymbol("TCD")).thenReturn(Optional.of(fund));
        when(instrumentRepository.findInstrumentBySymbol("F_TEST")).thenReturn(Optional.of(extraFund));
        when(instrumentRepository.findInstrumentBySymbol("F_SISE")).thenReturn(Optional.of(viop));
        when(marketDataRepository.findFirstByInstrumentOrderByTimestampDesc(any(Instrument.class)))
                .thenReturn(Optional.of(latest));

        fundScraperService.scrapeFunds();

        verify(instrumentRepository).findInstrumentBySymbol("TCD");
        verify(instrumentRepository).findInstrumentBySymbol("F_TEST");
        verify(instrumentRepository).findInstrumentBySymbol("F_SISE");
        verify(currentTraceContext, atLeastOnce()).wrap(any(Runnable.class));
        verify(restClient, never()).get();
        verify(marketDataPersistenceService, never()).saveHistoricalDataBatch(anyString(), anyList(), anyList());
    }

    @Test
    void firstSaveToDatabase_whenFundConfigured_createsTryFundInstrument() {
        when(instrumentRepository.save(any(Instrument.class))).thenAnswer(inv -> inv.getArgument(0));

        Instrument saved = ReflectionTestUtils.invokeMethod(fundScraperService, "firstSaveToDatabase", "TCD");

        assertNotNull(saved);
        assertEquals("TCD", saved.getSymbol());
        assertEquals("Test Fund", saved.getName());
        assertEquals(InstrumentType.FUND, saved.getType());
        assertEquals(Currency.TRY, saved.getBaseCurrency());
        assertTrue(saved.isActive());
        assertFalse(saved.isHistoricalDataLoaded());
    }

    @Test
    void firstSaveToDatabase_whenViopConfigured_createsTryViopInstrument() {
        when(instrumentRepository.save(any(Instrument.class))).thenAnswer(inv -> inv.getArgument(0));

        Instrument saved = ReflectionTestUtils.invokeMethod(fundScraperService, "firstSaveToDatabase", "F_SISE");

        assertNotNull(saved);
        assertEquals(InstrumentType.VIOP, saved.getType());
        assertEquals("Sise Viop", saved.getName());
    }

    @Test
    void firstSaveToDatabase_whenUnknownInstrument_throwsException() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> ReflectionTestUtils.invokeMethod(fundScraperService, "firstSaveToDatabase", "UNKNOWN")
        );

        assertTrue(exception.getMessage().contains("Instrument config"));
    }

    @Test
    void fetchAndProcess_whenInstrumentMissingAndValidResponse_savesHistoryBatch() {
        Instrument created = createInstrument("F_TEST");
        created.setType(InstrumentType.FUND);
        when(instrumentRepository.findInstrumentBySymbol("F_TEST")).thenReturn(Optional.empty());
        when(instrumentRepository.save(any(Instrument.class))).thenReturn(created);
        when(marketDataRepository.findFirstByInstrumentOrderByTimestampDesc(created)).thenReturn(Optional.empty());
        mockRestResponse(new FundHistoryResponse(
                List.of(1_700_000_000L, 1_700_086_400L),
                List.of(new BigDecimal("10.50"), new BigDecimal("11.25")),
                "ok"
        ));

        ReflectionTestUtils.invokeMethod(fundScraperService, "fetchAndProcess", "F_TEST");

        verify(instrumentRepository).save(any(Instrument.class));
        verify(marketDataPersistenceService).saveHistoricalDataBatch(
                eq("F_TEST"),
                eq(List.of(new BigDecimal("10.50"), new BigDecimal("11.25"))),
                eq(List.of(1_700_000_000L, 1_700_086_400L))
        );
    }

    @Test
    void fetchAndProcess_whenAlreadyUpToDate_skipsApiCall() {
        Instrument instrument = createInstrument("TCD");
        MarketData latest = new MarketData();
        latest.setTimestamp(LocalDate.now().atStartOfDay());

        when(instrumentRepository.findInstrumentBySymbol("TCD")).thenReturn(Optional.of(instrument));
        when(marketDataRepository.findFirstByInstrumentOrderByTimestampDesc(instrument)).thenReturn(Optional.of(latest));

        ReflectionTestUtils.invokeMethod(fundScraperService, "fetchAndProcess", "TCD");

        verify(restClient, never()).get();
        verify(marketDataPersistenceService, never()).saveHistoricalDataBatch(anyString(), anyList(), anyList());
    }

    @Test
    void fetchAndProcess_whenResponseOkButNoTimestamps_doesNotSaveHistory() {
        Instrument instrument = createInstrument("TCD");

        when(instrumentRepository.findInstrumentBySymbol("TCD")).thenReturn(Optional.of(instrument));
        when(marketDataRepository.findFirstByInstrumentOrderByTimestampDesc(instrument)).thenReturn(Optional.empty());
        mockRestResponse(new FundHistoryResponse(List.of(), List.of(), "ok"));

        ReflectionTestUtils.invokeMethod(fundScraperService, "fetchAndProcess", "TCD");

        verify(marketDataPersistenceService, never()).saveHistoricalDataBatch(anyString(), anyList(), anyList());
    }

    @Test
    void fetchAndProcess_whenResponseInvalid_doesNotSaveHistory() {
        Instrument instrument = createInstrument("TCD");

        when(instrumentRepository.findInstrumentBySymbol("TCD")).thenReturn(Optional.of(instrument));
        when(marketDataRepository.findFirstByInstrumentOrderByTimestampDesc(instrument)).thenReturn(Optional.empty());
        mockRestResponse(new FundHistoryResponse(null, null, "error"));

        ReflectionTestUtils.invokeMethod(fundScraperService, "fetchAndProcess", "TCD");

        verify(marketDataPersistenceService, never()).saveHistoricalDataBatch(anyString(), anyList(), anyList());
    }

    @Test
    void fetchAndProcess_whenRestClientThrows_swallowsException() {
        Instrument instrument = createInstrument("TCD");

        when(instrumentRepository.findInstrumentBySymbol("TCD")).thenReturn(Optional.of(instrument));
        when(marketDataRepository.findFirstByInstrumentOrderByTimestampDesc(instrument)).thenReturn(Optional.empty());
        when(restClient.get()).thenThrow(new RuntimeException("boom"));

        assertDoesNotThrow(() -> ReflectionTestUtils.invokeMethod(fundScraperService, "fetchAndProcess", "TCD"));
        verify(marketDataPersistenceService, never()).saveHistoricalDataBatch(anyString(), anyList(), anyList());
    }

    private void mockRestResponse(FundHistoryResponse response) {
        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString(), any(), any(), any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(eq("Accept"), eq("application/json"))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(FundHistoryResponse.class)).thenReturn(response);
    }

    private Instrument createInstrument(String symbol) {
        Instrument instrument = new Instrument();
        instrument.setSymbol(symbol);
        instrument.setBaseCurrency(Currency.TRY);
        instrument.setType(InstrumentType.FUND);
        return instrument;
    }
}
