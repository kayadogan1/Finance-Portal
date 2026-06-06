package com.finance.repositories;

import com.finance.models.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Spring Data repository for transaction persistence operations.
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    /**
     * Finds by portfolio id order by timestamp asc.
     *
     * @param portfolioId identifier of the portfolio
     * @return matching by portfolio id order by timestamp asc result
     */
    List<Transaction> findByPortfolioIdOrderByTimestampAsc(UUID portfolioId);
    /**
     * Finds by user id and timestamp after order by timestamp desc.
     *
     * @param userId identifier of the user
     * @param from from value
     * @return matching by user id and timestamp after order by timestamp desc result
     */
    List<Transaction> findByUserIdAndTimestampAfterOrderByTimestampDesc(String userId, LocalDateTime from);
}
