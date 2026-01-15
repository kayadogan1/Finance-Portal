package com.finance.repositories;

import com.finance.models.Instrument;
import com.finance.models.Transaction;
import com.finance.shared.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserIdOrderByTimestampDesc(String userId);

    List<Transaction> findByUserIdAndInstrument(String userId, Instrument instrument);

    List<Transaction> findByUserIdAndTimestampBetween(String userId, LocalDateTime start, LocalDateTime end);

    List<Transaction> findByUserIdAndType(String userId, TransactionType type);

}
