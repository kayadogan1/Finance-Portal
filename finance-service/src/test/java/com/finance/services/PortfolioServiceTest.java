package com.finance.services;

import com.finance.models.*;
import com.finance.repositories.*;
import com.finance.shared.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.*;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PortfolioServiceTest {

    @Mock
    private PortfolioRepository portfolioRepository;

    @Mock
    private MarketDataRepository marketDataRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private InstrumentRepository instrumentRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PortfolioService portfolioService;

    @Test
    void getPortfolio_whenPortfolioExists_returnsPortfolioReadDto() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        Portfolio portfolio = new Portfolio();
        portfolio.setId(portfolioId);
        portfolio.setName("Test Portfolio");
        portfolio.setItems(new ArrayList<>());
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));

        // Act
        PortfolioReadDto result = portfolioService.getPortfolio(userId, portfolioId);

        // Assert
        assertNotNull(result);
        assertEquals("Test Portfolio", result.portfolioName());
        verify(portfolioRepository).findByIdAndUserId(portfolioId, userId);
    }

    @Test
    void getPortfolio_whenPortfolioNotFound_throwsException() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.empty());

        // Act & Assert
        Exception exception = assertThrows(RuntimeException.class, () -> portfolioService.getPortfolio(userId, portfolioId));
        assertTrue(exception.getMessage().contains("Error occurred while mapper entity to dto"));
        verifyNoMoreInteractions(marketDataRepository, transactionRepository, instrumentRepository, userRepository);
    }

    @Test
    void getUserPortfolios_whenUserHasPortfolios_returnsList() {
        // Arrange
        String userId = "user123";
        Portfolio p1 = new Portfolio();
        p1.setItems(new ArrayList<>());
        Portfolio p2 = new Portfolio();
        p2.setItems(new ArrayList<>());
        when(portfolioRepository.findAllByUserId(userId)).thenReturn(Arrays.asList(p1, p2));

        // Act
        List<PortfolioReadDto> result = portfolioService.getUserPortfolios(userId);

        // Assert
        assertEquals(2, result.size());
        verify(portfolioRepository).findAllByUserId(userId);
    }

    @Test
    void createPortfolio_whenUserExists_savesPortfolio() {
        // Arrange
        String userId = "user123";
        PortfolioDto dto = new PortfolioDto("New Portfolio", RiskTolerance.AGGRESSIVE, PortfolioPurposeType.LONG_TERM_SAVINGS, new ArrayList<>());
        User user = new User();
        user.setId(userId);
        
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(portfolioRepository.save(any(Portfolio.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        portfolioService.createPortfolio(userId, dto);

        // Assert
        verify(portfolioRepository).save(any(Portfolio.class));
    }

    @Test
    void createPortfolio_whenUserNotFound_throwsException() {
        // Arrange
        String userId = "user123";
        PortfolioDto dto = new PortfolioDto("New Portfolio", RiskTolerance.AGGRESSIVE, PortfolioPurposeType.LONG_TERM_SAVINGS, new ArrayList<>());
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> portfolioService.createPortfolio(userId, dto));
        verify(portfolioRepository, never()).save(any());
        verifyNoMoreInteractions(portfolioRepository);
    }

    @Test
    void depositCash_whenValid_updatesBalanceAndSavesTransaction() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        BigDecimal amount = BigDecimal.valueOf(100.0);
        
        Portfolio portfolio = new Portfolio();
        portfolio.setId(portfolioId);
        portfolio.setCashBalance(BigDecimal.valueOf(50.0));
        
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));
        when(portfolioRepository.save(any(Portfolio.class))).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        portfolioService.depositCash(userId, amount, portfolioId);

        // Assert
        assertEquals(BigDecimal.valueOf(150.0), portfolio.getCashBalance());
        verify(portfolioRepository).save(portfolio);
        verify(transactionRepository).save(any(Transaction.class));
    }

    @Test
    void sellInstrument_whenSuccessful_updatesPortfolioAndRecordsTransaction() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        String symbol = "AAPL";
        BigDecimal sellQuantity = BigDecimal.valueOf(5);
        BigDecimal currentPrice = BigDecimal.valueOf(100);

        Instrument instrument = new Instrument();
        instrument.setSymbol(symbol);
        instrument.setCurrentPrice(currentPrice);

        PortfolioItem item = new PortfolioItem();
        item.setInstrument(instrument);
        item.setQuantity(BigDecimal.valueOf(10));

        Portfolio portfolio = new Portfolio();
        portfolio.setId(portfolioId);
        portfolio.setCashBalance(BigDecimal.valueOf(1000));
        List<PortfolioItem> items = new ArrayList<>();
        items.add(item);
        portfolio.setItems(items);

        when(instrumentRepository.findInstrumentBySymbol(symbol)).thenReturn(Optional.of(instrument));
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));
        when(portfolioRepository.save(any(Portfolio.class))).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        portfolioService.sellInstrument(userId, symbol, sellQuantity, portfolioId);

        // Assert
        assertEquals(BigDecimal.valueOf(5), item.getQuantity());
        // Proceeds: 5 * 100 = 500, Commission = 500 * 0.0025 = 1.25. Total amount = 498.75.
        // New balance = 1000 + 498.75 = 1498.75
        assertEquals(BigDecimal.valueOf(1498.75), portfolio.getCashBalance());
        verify(portfolioRepository).save(portfolio);
        verify(transactionRepository).save(any(Transaction.class));
    }

    @Test
    void sellInstrument_whenInstrumentNotFound_throwsException() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        String symbol = "AAPL";
        when(instrumentRepository.findInstrumentBySymbol(symbol)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> 
            portfolioService.sellInstrument(userId, symbol, BigDecimal.ONE, portfolioId));
        verify(portfolioRepository, never()).save(any());
        verify(transactionRepository, never()).save(any());
        verifyNoMoreInteractions(transactionRepository);
    }

    @Test
    void sellInstrument_whenNotEnoughQuantity_throwsException() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        String symbol = "AAPL";
        
        Instrument instrument = new Instrument();
        instrument.setSymbol(symbol);
        instrument.setCurrentPrice(BigDecimal.valueOf(100));

        PortfolioItem item = new PortfolioItem();
        item.setInstrument(instrument);
        item.setQuantity(BigDecimal.valueOf(1));

        Portfolio portfolio = new Portfolio();
        portfolio.setId(portfolioId);
        portfolio.setCashBalance(BigDecimal.valueOf(1000));
        portfolio.setItems(List.of(item));

        when(instrumentRepository.findInstrumentBySymbol(symbol)).thenReturn(Optional.of(instrument));
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));

        // Act & Assert
        assertThrows(RuntimeException.class, () -> 
            portfolioService.sellInstrument(userId, symbol, BigDecimal.valueOf(5), portfolioId));
        verify(portfolioRepository, never()).save(any());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void buyInstrument_whenSuccessfulNewInstrument_updatesPortfolioAndRecordsTransaction() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        String symbol = "AAPL";
        BigDecimal quantity = BigDecimal.valueOf(5);
        BigDecimal currentPrice = BigDecimal.valueOf(100);

        Instrument instrument = new Instrument();
        instrument.setSymbol(symbol);
        instrument.setCurrentPrice(currentPrice);

        Portfolio portfolio = new Portfolio();
        portfolio.setId(portfolioId);
        portfolio.setCashBalance(BigDecimal.valueOf(1000)); // Has enough balance
        portfolio.setItems(new ArrayList<>());

        when(instrumentRepository.findInstrumentBySymbol(symbol)).thenReturn(Optional.of(instrument));
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));
        when(portfolioRepository.save(any(Portfolio.class))).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        portfolioService.buyInstrument(userId, symbol, quantity, portfolioId);

        // Assert
        assertEquals(1, portfolio.getItems().size());
        assertEquals(quantity, portfolio.getItems().get(0).getQuantity());
        // Cost: 500, Commission: 1.25. Total: 501.25.
        // New balance: 1000 - 501.25 = 498.75
        assertEquals(BigDecimal.valueOf(498.75), portfolio.getCashBalance());
        verify(portfolioRepository).save(portfolio);
        verify(transactionRepository).save(any(Transaction.class));
    }

    @Test
    void buyInstrument_whenInsufficientBalance_throwsException() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        String symbol = "AAPL";
        
        Instrument instrument = new Instrument();
        instrument.setSymbol(symbol);
        instrument.setCurrentPrice(BigDecimal.valueOf(1000)); // Very expensive

        Portfolio portfolio = new Portfolio();
        portfolio.setId(portfolioId);
        portfolio.setCashBalance(BigDecimal.valueOf(500)); // Not enough balance

        when(instrumentRepository.findInstrumentBySymbol(symbol)).thenReturn(Optional.of(instrument));
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));

        // Act & Assert
        assertThrows(RuntimeException.class, () -> 
            portfolioService.buyInstrument(userId, symbol, BigDecimal.valueOf(5), portfolioId));
        verify(portfolioRepository, never()).save(any());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void getPortfolioChartValues_whenHasItems_returnsPieChartData() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        Portfolio portfolio = new Portfolio();
        Instrument inst = new Instrument();
        inst.setName("Apple");
        inst.setCurrentPrice(BigDecimal.valueOf(150));
        inst.setBaseCurrency(com.finance.shared.Currency.USD);
        
        PortfolioItem item = new PortfolioItem();
        item.setInstrument(inst);
        item.setQuantity(BigDecimal.valueOf(10));
        
        portfolio.setItems(List.of(item));
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));

        // Act
        List<PieChartDto> result = portfolioService.getPortfolioChartValues(userId, portfolioId);

        // Assert
        assertEquals(1, result.size());
        assertEquals("Apple", result.get(0).label());
        assertEquals(BigDecimal.valueOf(1500), result.get(0).totalValue());
    }

    @Test
    void getCalculatedPerformanceChartValues_calculatesCorrectly() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        Portfolio portfolio = new Portfolio();
        portfolio.setId(portfolioId);
        portfolio.setCreatedAt(LocalDateTime.now().minusDays(10));
        
        Instrument inst = new Instrument();
        inst.setId(UUID.randomUUID());
        
        Transaction t1 = new Transaction();
        t1.setInstrument(inst);
        t1.setQuantity(BigDecimal.TEN);
        t1.setType(TransactionType.BUY);
        t1.setTimestamp(LocalDateTime.now().minusDays(5));
        
        MarketData md = new MarketData();
        md.setInstrument(inst);
        md.setPrice(BigDecimal.valueOf(100));
        md.setTimestamp(LocalDateTime.now().minusDays(2));

        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));
        when(transactionRepository.findByPortfolioIdOrderByTimestampAsc(portfolioId)).thenReturn(List.of(t1));
        when(marketDataRepository.findDailyClosingPrices(any(), any(), any())).thenReturn(List.of(md));

        // Act
        List<PerformanceLineChartDto> result = portfolioService.getCalculatedPerformanceChartValues(userId, portfolioId, PortfolioRange.WEEKLY);

        // Assert
        assertNotNull(result);
        verify(transactionRepository).findByPortfolioIdOrderByTimestampAsc(portfolioId);
    }

    @Test
    void buyInstrument_whenUpdatingExisting_recalculatesAverageCost() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        String symbol = "AAPL";
        
        Instrument instrument = new Instrument();
        instrument.setSymbol(symbol);
        instrument.setCurrentPrice(BigDecimal.valueOf(200));

        PortfolioItem existingItem = new PortfolioItem();
        existingItem.setInstrument(instrument);
        existingItem.setQuantity(BigDecimal.valueOf(10));
        existingItem.setAverageCost(BigDecimal.valueOf(100));

        Portfolio portfolio = new Portfolio();
        portfolio.setItems(new ArrayList<>(List.of(existingItem)));
        portfolio.setCashBalance(BigDecimal.valueOf(5000));

        when(instrumentRepository.findInstrumentBySymbol(symbol)).thenReturn(Optional.of(instrument));
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));

        // Act
        portfolioService.buyInstrument(userId, symbol, BigDecimal.valueOf(10), portfolioId);

        // Assert
        // Old: 10 * 100 = 1000. New: 10 * 200 = 2000. Total: 3000. Qty: 20. Avg: 150.
        assertEquals(0, BigDecimal.valueOf(150).compareTo(existingItem.getAverageCost()));
        assertEquals(BigDecimal.valueOf(20), existingItem.getQuantity());
    }

    @Test
    void sellInstrument_whenQuantityReachedZero_removesItem() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        String symbol = "AAPL";
        
        Instrument instrument = new Instrument();
        instrument.setSymbol(symbol);
        instrument.setCurrentPrice(BigDecimal.valueOf(100));

        PortfolioItem item = new PortfolioItem();
        item.setInstrument(instrument);
        item.setQuantity(BigDecimal.valueOf(10));

        Portfolio portfolio = new Portfolio();
        portfolio.setItems(new ArrayList<>(List.of(item)));
        portfolio.setCashBalance(BigDecimal.valueOf(0));

        when(instrumentRepository.findInstrumentBySymbol(symbol)).thenReturn(Optional.of(instrument));
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.of(portfolio));

        // Act
        portfolioService.sellInstrument(userId, symbol, BigDecimal.valueOf(10), portfolioId);

        // Assert
        assertTrue(portfolio.getItems().isEmpty());
    }

    @Test
    void getAllPortfolios_returnsAllPortfolios() {
        // Arrange
        Portfolio p1 = new Portfolio();
        p1.setItems(new ArrayList<>());
        when(portfolioRepository.findAll()).thenReturn(List.of(p1));

        // Act
        List<PortfolioReadDto> result = portfolioService.getAllPortfolios();

        // Assert
        assertEquals(1, result.size());
        verify(portfolioRepository).findAll();
    }

    @Test
    void getPortfolioEntity_whenNotFound_throwsException() {
        // Arrange
        String userId = "user123";
        UUID portfolioId = UUID.randomUUID();
        when(portfolioRepository.findByIdAndUserId(portfolioId, userId)).thenReturn(Optional.empty());

        // Act & Assert
        Exception exception = assertThrows(RuntimeException.class, () -> portfolioService.getPortfolioChartValues(userId, portfolioId));
        assertTrue(exception.getMessage().contains("Portfolio not found for user"));
    }
}
