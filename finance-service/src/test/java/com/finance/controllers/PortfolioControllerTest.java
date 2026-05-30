package com.finance.controllers;

import com.finance.handling.ApiResult;
import com.finance.services.PortfolioService;
import com.finance.services.TransactionService;
import com.finance.shared.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PortfolioControllerTest {

    @Mock
    private PortfolioService portfolioService;

    @Mock
    private TransactionService transactionService;

    @InjectMocks
    private PortfolioController portfolioController;

    private Jwt jwt() {
        return new Jwt("token", Instant.now(), Instant.now().plusSeconds(3600), Map.of("alg", "none"), Map.of("sub", "user-1"));
    }

    @Test
    void getAllPortfolios_returnsWrappedList() {
        when(portfolioService.getAllPortfolios(Currency.TRY)).thenReturn(List.of());

        ResponseEntity<ApiResult<List<PortfolioReadDto>>> response = portfolioController.getAllPortfolios(jwt(), Currency.TRY);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(portfolioService).getAllPortfolios(Currency.TRY);
    }

    @Test
    void getUserPortfolios_returnsUserPortfolios() {
        when(portfolioService.getUserPortfolios("user-1", Currency.USD)).thenReturn(List.of());

        ResponseEntity<ApiResult<List<PortfolioReadDto>>> response = portfolioController.getUserPortfolios(jwt(), Currency.USD);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(portfolioService).getUserPortfolios("user-1", Currency.USD);
    }

    @Test
    void getPortfolio_returnsDto() {
        UUID portfolioId = UUID.randomUUID();
        PortfolioReadDto dto = PortfolioReadDto.builder().id(portfolioId).portfolioName("P1").build();
        when(portfolioService.getPortfolio("user-1", portfolioId, Currency.TRY)).thenReturn(dto);

        ResponseEntity<ApiResult<PortfolioReadDto>> response = portfolioController.getPortfolio(jwt(), portfolioId, Currency.TRY);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(portfolioId, response.getBody().data().id());
    }

    @Test
    void createPortfolio_delegatesToService() {
        PortfolioDto request = new PortfolioDto("New", RiskTolerance.MODERATE, PortfolioPurposeType.GENERAL, List.of());

        ResponseEntity<ApiResult<Void>> response = portfolioController.createPortfolio(request, jwt());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(portfolioService).createPortfolio("user-1", request);
    }

    @Test
    void getPortfolioHistory_returnsHistory() {
        UUID portfolioId = UUID.randomUUID();
        List<PerformanceLineChartDto> history = List.of(new PerformanceLineChartDto(LocalDate.now(), BigDecimal.TEN));
        when(portfolioService.getCalculatedPerformanceChartValues("user-1", portfolioId, PortfolioRange.MONTHLY, Currency.USD)).thenReturn(history);

        ResponseEntity<ApiResult<List<PerformanceLineChartDto>>> response =
                portfolioController.getPortfolioHistory(jwt(), portfolioId, PortfolioRange.MONTHLY, Currency.USD);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().data().size());
        verify(portfolioService).getCalculatedPerformanceChartValues("user-1", portfolioId, PortfolioRange.MONTHLY, Currency.USD);
    }

    @Test
    void depositFunds_delegatesToService() {
        UUID portfolioId = UUID.randomUUID();
        DepositRequest request = new DepositRequest();
        request.portfolioId = portfolioId;
        request.amount = BigDecimal.TEN;

        ResponseEntity<ApiResult<Void>> response = portfolioController.depositFunds(request, jwt());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(portfolioService).depositCash("user-1", BigDecimal.TEN, portfolioId);
    }

    @Test
    void sellInstrument_delegatesToService() {
        UUID portfolioId = UUID.randomUUID();
        BuyOrSellRequestDto request = new BuyOrSellRequestDto(portfolioId, "AAPL", BigDecimal.ONE);

        ResponseEntity<ApiResult<Void>> response = portfolioController.sellInstrument(request, jwt());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(portfolioService).sellInstrument("user-1", "AAPL", BigDecimal.ONE, portfolioId);
    }

    @Test
    void getCurrentPortfolioValue_returnsPieChart() {
        UUID portfolioId = UUID.randomUUID();
        List<PieChartDto> pie = List.of(PieChartDto.builder().label("AAPL").totalValue(BigDecimal.TEN).build());
        when(portfolioService.getPortfolioChartValues("user-1", portfolioId, Currency.USD)).thenReturn(pie);

        ResponseEntity<ApiResult<List<PieChartDto>>> response = portfolioController.getCurrentPortfolioValue(jwt(), portfolioId, Currency.USD);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().data().size());
    }

    @Test
    void getPortfolioTypeAllocation_returnsAllocation() {
        UUID portfolioId = UUID.randomUUID();
        List<PieChartDto> pie = List.of(PieChartDto.builder().label("US Hisse").totalValue(BigDecimal.TEN).build());
        when(portfolioService.getPortfolioTypeAllocation("user-1", portfolioId, Currency.TRY)).thenReturn(pie);

        ResponseEntity<ApiResult<List<PieChartDto>>> response = portfolioController.getPortfolioTypeAllocation(jwt(), portfolioId, Currency.TRY);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().data().size());
    }

    @Test
    void getCurrentProfit_returnsProfitRows() {
        UUID portfolioId = UUID.randomUUID();
        List<PortfolioCurrentProfitDto> rows = List.of(new PortfolioCurrentProfitDto(
                "Apple", "AAPL", InstrumentType.STOCK, Currency.USD, Currency.USD,
                BigDecimal.ONE, BigDecimal.TEN, BigDecimal.valueOf(12),
                BigDecimal.TEN, BigDecimal.valueOf(12), BigDecimal.valueOf(2), BigDecimal.valueOf(20), BigDecimal.ONE
        ));
        when(portfolioService.calculateCurrentPortfolioProfit("user-1", portfolioId, Currency.USD)).thenReturn(rows);

        ResponseEntity<ApiResult<List<PortfolioCurrentProfitDto>>> response = portfolioController.getCurrentProfit(jwt(), portfolioId, Currency.USD);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().data().size());
    }

    @Test
    void getTransactions_returnsTransactionList() {
        List<TransactionDto> txs = List.of(new TransactionDto(TransactionType.BUY, "AAPL", "Apple", Currency.USD, BigDecimal.ONE, BigDecimal.TEN, BigDecimal.TEN, LocalDateTime.now()));
        when(transactionService.getUserTransactionsByTimestamp("user-1", LocalDate.of(2026, 5, 1))).thenReturn(txs);

        ResponseEntity<ApiResult<List<TransactionDto>>> response =
                portfolioController.getUserTransactionsByTimeStamp(jwt(), LocalDate.of(2026, 5, 1));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().data().size());
    }

    @Test
    void buyInstrument_delegatesToService() {
        UUID portfolioId = UUID.randomUUID();
        BuyOrSellRequestDto request = new BuyOrSellRequestDto(portfolioId, "AAPL", BigDecimal.valueOf(2));

        ResponseEntity<ApiResult<Void>> response = portfolioController.buyInstrument(request, jwt());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(portfolioService).buyInstrument("user-1", "AAPL", BigDecimal.valueOf(2), portfolioId);
    }
}
