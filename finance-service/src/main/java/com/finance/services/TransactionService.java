package com.finance.services;

import com.finance.models.Transaction;
import com.finance.repositories.TransactionRepository;
import com.finance.shared.TransactionDto;
import org.springframework.cglib.core.Local;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
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
        List<Transaction> userTransactionList = transactionRepository.findByUserIdAndTimestampAfterOrderByTimestampDesc(userId,date);
        return userTransactionList.stream().map(userTransaction -> new TransactionDto(userTransaction.getType(), userTransaction.getInstrument().getName(), userTransaction.getQuantity(), userTransaction.getPrice(), userTransaction.getTimestamp())).collect(Collectors.toList());

    }




}
