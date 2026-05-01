package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import io.micrometer.tracing.CurrentTraceContext;
import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Collections;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SchedulerServiceTest {

    @Mock
    private FetchMarketDataService yahooService;

    @Mock
    private CryptoService cryptoService;

    @Mock
    private InstrumentPropertiesConfig config;

    @Mock
    private Tracer tracer;
    
    @Mock
    private CurrentTraceContext currentTraceContext;

    @Mock
    private Span span;

    @Mock
    private Tracer.SpanInScope spanInScope;

    @InjectMocks
    private SchedulerService schedulerService;

    @BeforeEach
    void setUp() {
        when(tracer.nextSpan()).thenReturn(span);
        when(tracer.nextSpan(any(Span.class))).thenReturn(span);
        when(tracer.withSpan(any(Span.class))).thenReturn(spanInScope);
        when(span.name(anyString())).thenReturn(span);
        when(span.tag(anyString(), anyString())).thenReturn(span);
        when(span.start()).thenReturn(span);
        when(tracer.currentTraceContext()).thenReturn(currentTraceContext);
        when(currentTraceContext.wrap(any(Runnable.class))).thenAnswer(inv -> {
            // Unpack and just return the runnable to execute natively
            return (Runnable) inv.getArgument(0);
        });
    }

    @Test
    void updateGeneralMarkets_whenCalled_callsYahooService() {
        // Act
        schedulerService.updateGeneralMarkets();

        // Assert
        verify(yahooService).updateAllMarketData();
    }

    @Test
    void updateBinanceCryptoData_whenConfigIsEmpty_doesNothing() {
        // Arrange
        when(config.getCrypto()).thenReturn(Collections.emptyMap());

        // Act
        schedulerService.updateBinanceCryptoData();

        // Assert
        verify(cryptoService, never()).fetchAndStoreCryptoData(anyString());
        verify(config).getCrypto();
    }

    @Test
    void updateBinanceCryptoData_whenConfigHasItems_fetchesAndStoresData() {
        // Arrange
        Map<String, String> cryptoMap = Map.of("BTC", "Bitcoin", "ETH", "Ethereum");
        when(config.getCrypto()).thenReturn(cryptoMap);
        
        // Act
        schedulerService.updateBinanceCryptoData();

        // Assert
        verify(config, atLeastOnce()).getCrypto();
        verify(cryptoService).fetchAndStoreCryptoData("BTC");
        verify(cryptoService).fetchAndStoreCryptoData("ETH");
        verifyNoMoreInteractions(yahooService);
    }
}
