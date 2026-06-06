package com.finance.repositories;


import com.finance.models.DailyPortfolioSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
/**
 * Spring Data repository for portfolio snapshot persistence operations.
 */
@Repository
public interface PortfolioSnapshotRepository extends JpaRepository<DailyPortfolioSnapshot,UUID> {

    /**
     * Finds by portfolio id and date after order by date asc.
     *
     * @param portfolioId identifier of the portfolio
     * @param date date value
     * @return matching by portfolio id and date after order by date asc result
     */
    List<DailyPortfolioSnapshot> findByPortfolioIdAndDateAfterOrderByDateAsc(UUID portfolioId, LocalDate date);


}
