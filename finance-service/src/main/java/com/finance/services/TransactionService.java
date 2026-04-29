package com.finance.services;

import com.finance.models.Instrument;
import com.finance.models.Transaction;
import com.finance.repositories.TransactionRepository;
import com.finance.shared.TransactionDto;
import org.springframework.stereotype.Service;

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
        if(date == null){
            date = LocalDate.now().minusWeeks(1);
        }
        LocalDateTime startDate = date.atStartOfDay();
        List<Transaction> userTransactionList = transactionRepository.findByUserIdAndTimestampAfterOrderByTimestampDesc(userId,startDate);
        return userTransactionList.stream()
                .map(userTransaction -> {
                    Instrument instrument = userTransaction.getInstrument();
                    return new TransactionDto(
                            userTransaction.getType(),
                            instrument.getSymbol(),
                            instrument.getName(),
                            instrument.getBaseCurrency(),
                            userTransaction.getQuantity(),
                            userTransaction.getPrice(),
                            userTransaction.getTimestamp()
                    );
                })
                .collect(Collectors.toList());

    }




}
