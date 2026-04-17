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
        instrument.setName("Apple Inc.");

        Transaction transaction = new Transaction();
        transaction.setType(TransactionType.BUY);
        transaction.setInstrument(instrument);
        transaction.setQuantity(BigDecimal.valueOf(10));
        transaction.setPrice(BigDecimal.valueOf(150.0));
        transaction.setTimestamp(LocalDateTime.of(2023, 10, 2, 12, 0));

        when(transactionRepository.findByUserIdAndTimestampAfterOrderByTimestampDesc(eq(userId), eq(startDate)))
                .thenReturn(List.of(transaction));

        // Act
        List<TransactionDto> result = transactionService.getUserTransactionsByTimestamp(userId, date);

        // Assert
        assertEquals(1, result.size());
        assertEquals("Apple Inc.", result.get(0).instrumentName());
        assertEquals(TransactionType.BUY, result.get(0).transactionType());
        assertEquals(BigDecimal.valueOf(10), result.get(0).quantity());
        assertEquals(BigDecimal.valueOf(150.0), result.get(0).price());
        
        verify(transactionRepository).findByUserIdAndTimestampAfterOrderByTimestampDesc(userId, startDate);
        verifyNoMoreInteractions(transactionRepository);
    }

    @Test
    void getUserTransactionsByTimestamp_whenDateIsNull_defaultsToOneWeekAgo() {
        // Arrange
        LocalDate expectedDefaultDate = LocalDate.now().minusWeeks(1);
        
        when(transactionRepository.findByUserIdAndTimestampAfterOrderByTimestampDesc(eq(userId), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // Act
        List<TransactionDto> result = transactionService.getUserTransactionsByTimestamp(userId, null);

        // Assert
        assertTrue(result.isEmpty());
        // verify it used expectedDefaultDate.atStartOfDay() at minimum 
        verify(transactionRepository).findByUserIdAndTimestampAfterOrderByTimestampDesc(
                eq(userId), 
                argThat(arg -> arg.toLocalDate().equals(expectedDefaultDate))
        );
    }
}
