package com.finance.services;

import com.finance.shared.BinanceResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.client.RestClient;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CryptoServiceTest {

    @Mock
    private MarketDataPersistenceService persistenceService;

    @Mock
    private RestClient restClient;

    @SuppressWarnings("rawtypes")
    @Mock
    private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    @InjectMocks
    private CryptoService cryptoService;

    private final String API_URL = "http://api.binance.com";

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(cryptoService, "CRYPTO_API_URL", API_URL);

        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString(), anyString())).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);
    }

    @Test
    void fetchAndStoreCryptoData_whenValidResponse_savesMarketData() {
        // Arrange
        String symbol = "BTC";
        BinanceResponseDto dto = new BinanceResponseDto();
        dto.setSymbol("BTCUSDT");
        dto.setPrice("50000.00");
        when(responseSpec.body(BinanceResponseDto.class)).thenReturn(dto);

        // Act
        cryptoService.fetchAndStoreCryptoData(symbol);

        // Assert
        verify(requestHeadersUriSpec).uri(eq(API_URL + "/api/v3/ticker/price?symbol={symbol}"), eq("BTCUSDT"));
        verify(persistenceService).saveMarketData(eq("BTC"), eq(new BigDecimal("50000.00")));
    }

    @Test
    void fetchAndStoreCryptoData_whenSymbolAlreadyHasUSDT_fetchesCorrectly() {
        // Arrange
        String symbol = "ETHUSDT";
        BinanceResponseDto dto = new BinanceResponseDto();
        dto.setSymbol("ETHUSDT");
        dto.setPrice("3000.00");
        when(responseSpec.body(BinanceResponseDto.class)).thenReturn(dto);

        // Act
        cryptoService.fetchAndStoreCryptoData(symbol);

        // Assert
        verify(requestHeadersUriSpec).uri(eq(API_URL + "/api/v3/ticker/price?symbol={symbol}"), eq("ETHUSDT"));
        verify(persistenceService).saveMarketData(eq("ETHUSDT"), eq(new BigDecimal("3000.00")));
    }

    @Test
    void fetchAndStoreCryptoData_whenResponseIsNull_doesNotSaveMarketData() {
        // Arrange
        String symbol = "BTC";
        when(responseSpec.body(BinanceResponseDto.class)).thenReturn(null);

        // Act
        cryptoService.fetchAndStoreCryptoData(symbol);

        // Assert
        verify(persistenceService, never()).saveMarketData(anyString(), any(BigDecimal.class));
        verifyNoMoreInteractions(persistenceService);
    }

    @Test
    void fetchAndStoreCryptoData_whenApiThrowsException_catchesAndLogs() {
        // Arrange
        String symbol = "BTC";
        when(responseSpec.body(BinanceResponseDto.class)).thenThrow(new RuntimeException("API Error"));

        // Act
        cryptoService.fetchAndStoreCryptoData(symbol);

        // Assert
        verify(persistenceService, never()).saveMarketData(anyString(), any(BigDecimal.class));
    }
}
