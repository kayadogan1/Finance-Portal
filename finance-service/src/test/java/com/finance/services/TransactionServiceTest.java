package com.finance.services;

import com.finance.models.Instrument;
import com.finance.models.Transaction;
import com.finance.repositories.TransactionRepository;
import com.finance.shared.TransactionDto;
import com.finance.shared.TransactionType;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private TransactionService transactionService;

    private final String userId = "user123";

    @Test
    void getUserTransactionsByTimestamp_whenDateProvided_returnsTransactions() {
        // Arrange
        LocalDate date = LocalDate.of(2023, 10, 1);
        LocalDateTime startDate = date.atStartOfDay();

        Instrument instrument = new Instrument();
        instrument.setSymbol("AAPL");
        instrument.setName("Apple Inc.");
        instrument.setBaseCurrency(com.finance.shared.Currency.USD);

        Transaction transaction = new Transaction();
        transaction.setType(TransactionType.BUY);
        transaction.setInstrument(instrument);
        transaction.setQuantity(BigDecimal.valueOf(10));
        transaction.setPrice(BigDecimal.valueOf(150.0));
        transaction.setTotalAmount(BigDecimal.valueOf(1500.0));
        transaction.setTimestamp(LocalDateTime.of(2023, 10, 2, 12, 0));

        when(transactionRepository.findByUserIdAndTimestampAfterOrderByTimestampDesc(eq(userId), eq(startDate)))
                .thenReturn(List.of(transaction));

        // Act
        List<TransactionDto> result = transactionService.getUserTransactionsByTimestamp(userId, date);

        // Assert
        assertEquals(1, result.size());
        assertEquals("AAPL", result.get(0).instrumentSymbol());
        assertEquals("Apple Inc.", result.get(0).instrumentName());
        assertEquals(com.finance.shared.Currency.USD, result.get(0).currency());
        assertEquals(TransactionType.BUY, result.get(0).transactionType());
        assertEquals(BigDecimal.valueOf(10), result.get(0).quantity());
        assertEquals(BigDecimal.valueOf(150.0), result.get(0).price());
        assertEquals(BigDecimal.valueOf(1500.0), result.get(0).totalAmount());
        
        verify(transactionRepository).findByUserIdAndTimestampAfterOrderByTimestampDesc(userId, startDate);
        verifyNoMoreInteractions(transactionRepository);
    }

    @Test
    void getUserTransactionsByTimestamp_whenDateIsNull_returnsAllTransactions() {
        // Arrange
        LocalDate expectedDefaultDate = LocalDate.of(1970, 1, 1);
        
        when(transactionRepository.findByUserIdAndTimestampAfterOrderByTimestampDesc(eq(userId), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // Act
        List<TransactionDto> result = transactionService.getUserTransactionsByTimestamp(userId, null);

        // Assert
        assertTrue(result.isEmpty());
        verify(transactionRepository).findByUserIdAndTimestampAfterOrderByTimestampDesc(
                eq(userId), 
                argThat(arg -> arg.toLocalDate().equals(expectedDefaultDate))
        );
    }

    @Test
    void getUserTransactionsByTimestamp_whenCashTransaction_returnsCashDto() {
        Transaction transaction = new Transaction();
        transaction.setType(TransactionType.DEPOSIT);
        transaction.setTotalAmount(BigDecimal.valueOf(5000));
        transaction.setTimestamp(LocalDateTime.of(2024, 1, 2, 9, 30));

        when(transactionRepository.findByUserIdAndTimestampAfterOrderByTimestampDesc(eq(userId), any(LocalDateTime.class)))
                .thenReturn(List.of(transaction));

        List<TransactionDto> result = transactionService.getUserTransactionsByTimestamp(userId, null);

        assertEquals(1, result.size());
        assertNull(result.get(0).instrumentSymbol());
        assertEquals("Nakit Bakiye", result.get(0).instrumentName());
        assertEquals(com.finance.shared.Currency.TRY, result.get(0).currency());
        assertEquals(BigDecimal.ZERO, result.get(0).quantity());
        assertEquals(BigDecimal.ZERO, result.get(0).price());
        assertEquals(BigDecimal.valueOf(5000), result.get(0).totalAmount());
    }
}
