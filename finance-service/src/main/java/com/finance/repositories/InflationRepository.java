package com.finance.repositories;

import com.finance.models.Inflation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
@Repository
public interface InflationRepository extends JpaRepository<Inflation,Long> {

    Optional<Inflation> findByTimestamp(LocalDate date);
    List<Inflation> findByTimestampGreaterThanEqualOrderByTimestampAsc(LocalDate date);
    Optional<Inflation> findTopByOrderByTimestampDesc();
}
