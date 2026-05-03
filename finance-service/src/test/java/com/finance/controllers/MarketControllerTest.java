package com.finance.controllers;

import com.finance.handling.ApiResult;
import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.repositories.MarketDataRepository;
import com.finance.services.InstrumentService;
import com.finance.services.MarketDataService;
import com.finance.shared.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketControllerTest {

    @Mock
    private InstrumentService instrumentService;

    @Mock
    private MarketDataRepository marketDataRepository;

    @Mock
    private MarketDataService marketDataService;

    @InjectMocks
    private MarketController marketController;

    @Test
    void getInstrumentBySymbol_returnsWrappedInstrumentDto() {
        Instrument instrument = new Instrument();
        instrument.setSymbol("AAPL");
        InstrumentDto dto = new InstrumentDto(
                "AAPL", "Apple", InstrumentType.STOCK,
                BigDecimal.TEN, BigDecimal.ONE, Currency.USD, "US",
                LocalDateTime.now(), true, true
        );
        when(instrumentService.getInstrumentBySymbol("AAPL")).thenReturn(instrument);
        when(instrumentService.toInstrumentDto(instrument)).thenReturn(dto);

        ResponseEntity<ApiResult<InstrumentDto>> response = marketController.getInstrumentBySymbol("AAPL");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("instrument fetched", response.getBody().message());
        assertEquals("AAPL", response.getBody().data().getSymbol());
    }

    @Test
    void getAllInstruments_returnsPagedResult() {
        Page<InstrumentDto> page = new PageImpl<>(List.of());
        when(instrumentService.getAllInstruments("app", InstrumentType.STOCK, "US", Currency.USD, 1, 10)).thenReturn(page);

        ResponseEntity<ApiResult<Page<InstrumentDto>>> response =
                marketController.getAllInstruments("app", InstrumentType.STOCK, "US", Currency.USD, 1, 10);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(page, response.getBody().data());
    }

    @Test
    void getMarketMovers_returnsPagedResult() {
        Page<InstrumentDto> page = new PageImpl<>(List.of());
        when(instrumentService.getMarketMovers("GAINERS", "TR", InstrumentType.STOCK, Currency.TRY, 0, 20)).thenReturn(page);

        ResponseEntity<ApiResult<Page<InstrumentDto>>> response =
                marketController.getMarketMovers("GAINERS", "TR", InstrumentType.STOCK, Currency.TRY, 0, 20);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(page, response.getBody().data());
    }

    @Test
    void getCandlesBySymbol_returnsCandles() {
        List<CandleDto> candles = List.of(new CandleDto(LocalDateTime.now(), BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ONE, BigDecimal.TEN));
        when(marketDataService.getMarketDataHistory("AAPL", null, TimeSlot.D1)).thenReturn(candles);

        ResponseEntity<ApiResult<List<CandleDto>>> response = marketController.getCandlesBySymbol("AAPL", TimeSlot.D1, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().data().size());
    }

    @Test
    void getLinesBySymbol_returnsLinePoints() {
        List<LineChartDto> lines = List.of(new LineChartDto(LocalDateTime.now(), BigDecimal.TEN));
        when(marketDataService.getLineChartDataFrom("AAPL", null)).thenReturn(lines);

        ResponseEntity<ApiResult<List<LineChartDto>>> response = marketController.getLinesBySymbol("AAPL", null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().data().size());
    }

    @Test
    void getMarketDataHistory_withFutureDate_returnsBadRequest() {
        ResponseEntity<ApiResult<List<MarketData>>> response =
                marketController.getMarketDataHistory("AAPL", LocalDateTime.now().plusDays(1));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void getMarketDataHistory_withoutFrom_usesFullHistoryQuery() {
        MarketData entry = new MarketData();
        when(marketDataRepository.findByInstrumentSymbolOrderByTimestampAsc("AAPL")).thenReturn(List.of(entry));

        ResponseEntity<ApiResult<List<MarketData>>> response = marketController.getMarketDataHistory("AAPL", null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().data().size());
        verify(marketDataRepository).findByInstrumentSymbolOrderByTimestampAsc("AAPL");
    }

    @Test
    void getMarketDataHistory_withFrom_usesFilteredQuery() {
        MarketData entry = new MarketData();
        LocalDateTime from = LocalDateTime.now().minusDays(3);
        when(marketDataRepository.findByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc("AAPL", from)).thenReturn(List.of(entry));

        ResponseEntity<ApiResult<List<MarketData>>> response = marketController.getMarketDataHistory("AAPL", from);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().data().size());
        verify(marketDataRepository).findByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc("AAPL", from);
    }

    @Test
    void getHypotheticalReturn_returnsDto() {
        HypotheticalReturnDto dto = new HypotheticalReturnDto(
                "AAPL", "Apple", InstrumentType.STOCK, Currency.USD, Currency.TRY,
                LocalDate.now().minusDays(10), LocalDateTime.now().minusDays(10),
                BigDecimal.ONE, BigDecimal.TEN, BigDecimal.valueOf(12),
                BigDecimal.TEN, BigDecimal.valueOf(12), BigDecimal.valueOf(2), BigDecimal.valueOf(20), BigDecimal.valueOf(40)
        );
        when(marketDataService.calculateHypotheticalReturn("AAPL", LocalDate.of(2026, 4, 1), BigDecimal.valueOf(5), Currency.TRY))
                .thenReturn(dto);

        ResponseEntity<ApiResult<HypotheticalReturnDto>> response =
                marketController.getHypotheticalReturn("AAPL", LocalDate.of(2026, 4, 1), BigDecimal.valueOf(5), Currency.TRY);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("AAPL", response.getBody().data().symbol());
    }
}
