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

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;


    public TransactionService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

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

    private BigDecimal valueOrZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

}
