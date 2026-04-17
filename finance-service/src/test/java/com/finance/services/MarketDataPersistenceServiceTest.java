package com.finance.services;

import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MarketDataPersistenceServiceTest {

    @Mock
    private InstrumentRepository instrumentRepository;

    @Mock
    private MarketDataRepository marketDataRepository;

    @Mock
    private RedisCacheService redisCacheService;

    @InjectMocks
    private MarketDataPersistenceService marketDataPersistenceService;

    @Test
    void saveMarketData_whenInstrumentExists_updatesAndSavesData() {
        // Arrange
        String symbol = "AAPL";
        BigDecimal price = new BigDecimal("150.0");

        Instrument instrument = new Instrument();
        instrument.setSymbol(symbol);
        instrument.setCurrentPrice(new BigDecimal("140.0"));

        when(instrumentRepository.findInstrumentBySymbol(symbol)).thenReturn(Optional.of(instrument));
        when(instrumentRepository.save(any(Instrument.class))).thenAnswer(inv -> inv.getArgument(0));
        when(marketDataRepository.save(any(MarketData.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        marketDataPersistenceService.saveMarketData(symbol, price);

        // Assert
        verify(instrumentRepository).findInstrumentBySymbol(symbol);
        verify(instrumentRepository).save(instrument);
        assertEquals(price, instrument.getCurrentPrice());
        assertNotNull(instrument.getLastUpdateTime());
        
        verify(redisCacheService).save(symbol, instrument);
        verify(marketDataRepository).save(any(MarketData.class));
    }

    @Test
    void saveMarketData_whenInstrumentNotFound_doesNothing() {
        // Arrange
        String symbol = "UNKNOWN";
        BigDecimal price = new BigDecimal("100.0");

        when(instrumentRepository.findInstrumentBySymbol(symbol)).thenReturn(Optional.empty());

        // Act
        marketDataPersistenceService.saveMarketData(symbol, price);

        // Assert
        verify(instrumentRepository).findInstrumentBySymbol(symbol);
        verify(instrumentRepository, never()).save(any(Instrument.class));
        verify(redisCacheService, never()).save(anyString(), any());
        verify(marketDataRepository, never()).save(any(MarketData.class));
    }
}
