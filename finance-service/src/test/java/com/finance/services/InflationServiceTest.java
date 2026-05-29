package com.finance.services;

import com.finance.models.Inflation;
import com.finance.models.Instrument;
import com.finance.models.Portfolio;
import com.finance.models.Transaction;
import com.finance.models.User;
import com.finance.repositories.InflationRepository;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.PortfolioRepository;
import com.finance.repositories.TransactionRepository;
import com.finance.shared.Currency;
import com.finance.shared.InstrumentType;
import com.finance.shared.PerformanceLineChartDtoWithInflationDto;
import com.finance.shared.PortfolioReadDto;
import com.finance.shared.TransactionType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InflationServiceTest {

    @Mock
    private InflationRepository inflationRepository;

    @Mock
    private InstrumentRepository instrumentRepository;

    @Mock
    private PortfolioRepository portfolioRepository;

    @Mock
    private PortfolioService portfolioService;

    @Mock
    private TransactionRepository transactionRepository;

    @Test
    void calculateInflationEffectInPortfolio_whenUsdRequested_usesUsdPortfolioSummaryAndReturnsUsdValues() {
        String userId = "user-1";
        UUID portfolioId = UUID.randomUUID();

        User user = new User();
        user.setId(userId);

        Portfolio portfolio = new Portfolio();
        portfolio.setId(portfolioId);
        portfolio.setUser(user);

        Instrument apple = Instrument.builder()
                .id(UUID.randomUUID())
                .symbol("AAPL")
                .name("Apple")
                .type(InstrumentType.STOCK)
                .baseCurrency(Currency.USD)
                .currentPrice(new BigDecimal("120"))
                .build();

        Transaction buy = Transaction.builder()
                .portfolioId(portfolioId)
                .Instrument(apple)
                .type(TransactionType.BUY)
                .quantity(new BigDecimal("2"))
                .price(new BigDecimal("100"))
                .timestamp(LocalDateTime.now().withDayOfMonth(1))
                .build();

        Instrument usdTry = Instrument.builder()
                .symbol("USDTRY")
                .baseCurrency(Currency.TRY)
                .currentPrice(new BigDecimal("40"))
                .build();

        PortfolioReadDto usdSummary = PortfolioReadDto.builder()
                .id(portfolioId)
                .holdingsValue(new BigDecimal("240"))
                .totalCost(new BigDecimal("200"))
                .displayCurrency(Currency.USD)
                .build();

        Inflation zeroInflation = Inflation.builder()
                .rate(0.0)
                .associatedCountry("TR")
                .timestamp(LocalDate.now().withDayOfMonth(1))
                .build();

        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));
        when(transactionRepository.findByPortfolioIdOrderByTimestampAsc(portfolioId)).thenReturn(List.of(buy));
        when(instrumentRepository.findInstrumentBySymbol("USDTRY")).thenReturn(Optional.of(usdTry));
        when(portfolioService.getPortfolio(userId, portfolioId, Currency.USD)).thenReturn(usdSummary);
        when(inflationRepository.findByTimestampGreaterThanEqualOrderByTimestampAsc(any(LocalDate.class))).thenReturn(List.of(zeroInflation));

        PerformanceLineChartDtoWithInflationDto result =
                new InflationService(inflationRepository, instrumentRepository, portfolioRepository, portfolioService, transactionRepository)
                        .calculateInflationEffectInPortfolio(userId, portfolioId, Currency.USD);

        assertEquals(Currency.USD, result.currency());
        assertEquals(0, new BigDecimal("240").compareTo(result.portfolioValue()));
        assertEquals(0, new BigDecimal("200").compareTo(result.nominalCost()));
        assertEquals(0, new BigDecimal("40").compareTo(result.nominalReturn()));
        verify(portfolioService).getPortfolio(userId, portfolioId, Currency.USD);
    }
}
