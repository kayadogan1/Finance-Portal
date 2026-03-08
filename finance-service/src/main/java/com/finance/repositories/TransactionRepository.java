package com.finance.repositories;

import com.finance.models.Instrument;
import com.finance.models.Transaction;
import com.finance.shared.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByPortfolioIdOrderByTimestampAsc(UUID portfolioId);

}
