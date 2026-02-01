package com.finance.repositories;


import com.finance.models.DailyPortfolioSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
@Repository
public interface PortfolioSnapshotRepository extends JpaRepository<DailyPortfolioSnapshot,UUID> {

    List<DailyPortfolioSnapshot> findByPortfolioIdAndDateAfterOrderByDateAsc(UUID portfolioId, LocalDate date);


}
