package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import com.finance.exceptions.BadRequestException;
import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import com.finance.shared.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MarketDataServiceTest {

    @Mock
    private InstrumentRepository instrumentRepository;

    @Mock
    private MarketDataRepository marketDataRepository;

    @Mock
    private InstrumentPropertiesConfig instrumentProperties;

    @InjectMocks
    private MarketDataService marketDataService;

    @BeforeEach
    void setUp() {
        when(instrumentRepository.save(any(Instrument.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void initDefaultInstruments_whenPropertiesProvided_createsInstruments() {
        // Arrange
        when(instrumentProperties.getStock()).thenReturn(Map.of("BIST", Map.of("THYAO", "Turkish Airlines")));
        when(instrumentProperties.getForex()).thenReturn(Map.of("EURUSD", "Euro / US Dollar"));
        when(instrumentProperties.getCrypto()).thenReturn(Collections.emptyMap());
        when(instrumentProperties.getCommodity()).thenReturn(null);
        when(instrumentProperties.getIndex()).thenReturn(Collections.emptyMap());
        when(instrumentProperties.getBond()).thenReturn(Collections.emptyMap());
        when(instrumentProperties.getFiat()).thenReturn(Map.of("USD", "US Dollar"));

        when(instrumentRepository.findInstrumentBySymbol(anyString())).thenReturn(Optional.empty());

        // Act
        marketDataService.initDefaultInstruments();

        // Assert
        verify(instrumentRepository, atLeastOnce()).save(any(Instrument.class));
        verify(instrumentRepository).findInstrumentBySymbol("THYAO");
        verify(instrumentRepository).findInstrumentBySymbol("EURUSD");
        verify(instrumentRepository).findInstrumentBySymbol("USD");
    }

    @Test
    void initDefaultInstruments_whenInstrumentExistsWithDifferentName_updatesInstrument() {
        // Arrange
        when(instrumentProperties.getStock()).thenReturn(Map.of("BIST", Map.of("THYAO", "New Name THY")));
        Instrument existingInt = new Instrument();
        existingInt.setSymbol("THYAO");
        existingInt.setName("Old Name");
        existingInt.setBaseCurrency(Currency.TRY);
        when(instrumentRepository.findInstrumentBySymbol("THYAO")).thenReturn(Optional.of(existingInt));

        // Act
        marketDataService.initDefaultInstruments();

        // Assert
        verify(instrumentRepository).save(any(Instrument.class));
        assertEquals("New Name THY", existingInt.getName());
    }

    @Test
    void getLineChartDataFrom_whenValidDataExists_returnsLineChartDtoList() {
        // Arrange
        String symbol = "AAPL";
        LocalDateTime from = LocalDateTime.now().minusDays(1);
        MarketData data = new MarketData();
        data.setTimestamp(LocalDateTime.now().minusHours(1));
        data.setPrice(new BigDecimal("150.0"));
        
        when(marketDataRepository.findByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc(symbol, from))
                .thenReturn(List.of(data));

        // Act
        List<LineChartDto> result = marketDataService.getLineChartDataFrom(symbol, from);

        // Assert
        assertEquals(1, result.size());
        assertEquals(new BigDecimal("150.0"), result.get(0).close());
    }

    @Test
    void getLineChartDataFrom_whenSymbolIsNull_throwsBadRequestException() {
        assertThrows(BadRequestException.class, () -> marketDataService.getLineChartDataFrom(null, LocalDateTime.now()));
    }

    @Test
    void getLineChartDataFrom_whenDateIsInFuture_throwsBadRequestException() {
        assertThrows(BadRequestException.class, () -> marketDataService.getLineChartDataFrom("AAPL", LocalDateTime.now().plusDays(1)));
    }

    @Test
    void getMarketDataHistory_whenInstrumentNotFound_returnsEmptyList() {
        when(instrumentRepository.findInstrumentBySymbol("UNKNOWN")).thenReturn(Optional.empty());
        List<CandleDto> result = marketDataService.getMarketDataHistory("UNKNOWN", LocalDateTime.now().minusDays(1), TimeSlot.D1);
        assertTrue(result.isEmpty());
    }

    @Test
    void getMarketDataHistory_whenDateInFuture_throwsBadRequestException() {
        when(instrumentRepository.findInstrumentBySymbol("AAPL")).thenReturn(Optional.of(new Instrument()));
        when(marketDataRepository.findByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc(eq("AAPL"), any()))
                .thenReturn(List.of(new MarketData()));
        
        assertThrows(BadRequestException.class, () -> 
            marketDataService.getMarketDataHistory("AAPL", LocalDateTime.now().plusDays(1), TimeSlot.D1)
        );
    }
    
    @Test
    void getMarketDataHistory_createsCandlesCorrectly() {
        // Arrange
        String symbol = "AAPL";
        LocalDateTime fromTimestamp = LocalDateTime.now().minusDays(2);
        
        Instrument instrument = new Instrument();
        when(instrumentRepository.findInstrumentBySymbol(symbol)).thenReturn(Optional.of(instrument));

        MarketData data1 = new MarketData();
        data1.setTimestamp(LocalDateTime.now().minusDays(1).withHour(10));
        data1.setPrice(new BigDecimal("100"));

        MarketData data2 = new MarketData();
        data2.setTimestamp(LocalDateTime.now().minusDays(1).withHour(11));
        data2.setPrice(new BigDecimal("110"));

        when(marketDataRepository.findByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc(symbol, fromTimestamp))
                .thenReturn(List.of(data1, data2));

        // Act
        List<CandleDto> result = marketDataService.getMarketDataHistory(symbol, fromTimestamp, TimeSlot.D1);

        // Assert
        assertEquals(1, result.size());
        assertEquals(new BigDecimal("100"), result.get(0).open());
        assertEquals(new BigDecimal("110"), result.get(0).high());
        assertEquals(new BigDecimal("100"), result.get(0).low());
        assertEquals(new BigDecimal("110"), result.get(0).close());
    }

    @Test
    void calculateHypotheticalReturn_whenValidInputs_returnsConvertedProfit() {
        Instrument instrument = new Instrument();
        instrument.setSymbol("AAPL");
        instrument.setName("Apple");
        instrument.setType(InstrumentType.STOCK);
        instrument.setBaseCurrency(Currency.USD);
        instrument.setCurrentPrice(new BigDecimal("120"));

        Instrument usdtry = new Instrument();
        usdtry.setCurrentPrice(new BigDecimal("40"));

        MarketData purchaseData = new MarketData();
        purchaseData.setTimestamp(LocalDateTime.of(2026, 4, 2, 10, 0));
        purchaseData.setPrice(new BigDecimal("100"));

        when(instrumentRepository.findInstrumentBySymbol("AAPL")).thenReturn(Optional.of(instrument));
        when(instrumentRepository.findInstrumentBySymbol("USDTRY")).thenReturn(Optional.of(usdtry));
        when(marketDataRepository.findFirstByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc(eq("AAPL"), any()))
                .thenReturn(Optional.of(purchaseData));

        HypotheticalReturnDto result = marketDataService.calculateHypotheticalReturn(
                "AAPL",
                LocalDate.of(2026, 4, 1),
                BigDecimal.valueOf(2),
                Currency.TRY
        );

        assertEquals("AAPL", result.symbol());
        assertEquals(new BigDecimal("8000"), result.costValue());
        assertEquals(new BigDecimal("9600"), result.currentValue());
        assertEquals(new BigDecimal("1600"), result.profitLoss());
        assertEquals(new BigDecimal("20.00"), result.profitLossPercent());
    }

    @Test
    void calculateHypotheticalReturn_whenQuantityInvalid_throwsBadRequestException() {
        assertThrows(BadRequestException.class, () ->
                marketDataService.calculateHypotheticalReturn("AAPL", LocalDate.now().minusDays(1), BigDecimal.ZERO, Currency.USD)
        );
    }

    @Test
    void calculateHypotheticalReturn_whenNoMarketData_throwsBadRequestException() {
        Instrument instrument = new Instrument();
        instrument.setSymbol("AAPL");
        instrument.setBaseCurrency(Currency.USD);
        when(instrumentRepository.findInstrumentBySymbol("AAPL")).thenReturn(Optional.of(instrument));
        when(instrumentRepository.findInstrumentBySymbol("USDTRY")).thenReturn(Optional.empty());
        when(marketDataRepository.findFirstByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc(eq("AAPL"), any()))
                .thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () ->
                marketDataService.calculateHypotheticalReturn("AAPL", LocalDate.now().minusDays(10), BigDecimal.ONE, Currency.USD)
        );
    }
}
