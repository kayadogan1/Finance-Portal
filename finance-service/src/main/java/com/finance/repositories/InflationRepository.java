package com.finance.repositories;

import com.finance.models.Inflation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface InflationRepository extends JpaRepository<Inflation,Long> {

    Optional<Inflation> findByTimestamp(LocalDate date);
}
