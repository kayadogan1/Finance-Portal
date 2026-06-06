package com.finance.repositories;

import com.finance.models.Inflation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
/**
 * Spring Data repository for inflation persistence operations.
 */
@Repository
public interface InflationRepository extends JpaRepository<Inflation,Long> {

    /**
     * Finds by timestamp.
     *
     * @param date date value
     * @return matching by timestamp result
     */
    Optional<Inflation> findByTimestamp(LocalDate date);
    /**
     * Finds by timestamp greater than equal order by timestamp asc.
     *
     * @param date date value
     * @return matching by timestamp greater than equal order by timestamp asc result
     */
    List<Inflation> findByTimestampGreaterThanEqualOrderByTimestampAsc(LocalDate date);
    /**
     * Finds top by order by timestamp desc.
     *
     * @return matching top by order by timestamp desc result
     */
    Optional<Inflation> findTopByOrderByTimestampDesc();
}
