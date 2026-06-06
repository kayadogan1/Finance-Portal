package com.finance.services;

import com.finance.models.Instrument;
import com.finance.models.Transaction;
import com.finance.repositories.TransactionRepository;
import com.finance.shared.TransactionDto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service component that handles transaction operations.
 */
@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;


    /**
     * Creates a new TransactionService with its required dependencies.
     *
     * @param transactionRepository transaction repository value
     */
    public TransactionService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    /**
     * Returns user transactions by timestamp.
     *
     * @param userId identifier of the user
     * @param date date value
     * @return user transactions by timestamp result
     */
    public List<TransactionDto> getUserTransactionsByTimestamp(String userId, LocalDate date) {
        LocalDateTime startDate = date == null ? LocalDate.of(1970, 1, 1).atStartOfDay() : date.atStartOfDay();
        List<Transaction> userTransactionList = transactionRepository.findByUserIdAndTimestampAfterOrderByTimestampDesc(userId,startDate);
        return userTransactionList.stream()
                .map(userTransaction -> {
                    Instrument instrument = userTransaction.getInstrument();
                    String symbol = instrument == null ? null : instrument.getSymbol();
                    String name = instrument == null ? "Nakit Bakiye" : instrument.getName();
                    var currency = instrument == null ? com.finance.shared.Currency.TRY : instrument.getBaseCurrency();
                    return new TransactionDto(
                            userTransaction.getType(),
                            symbol,
                            name,
                            currency,
                            valueOrZero(userTransaction.getQuantity()),
                            valueOrZero(userTransaction.getPrice()),
                            valueOrZero(userTransaction.getTotalAmount()),
                            userTransaction.getTimestamp()
                    );
                })
                .collect(Collectors.toList());

    }

    /**
     * Returns the result of value or zero.
     *
     * @param value value value
     * @return value or zero result
     */
    private BigDecimal valueOrZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

}
