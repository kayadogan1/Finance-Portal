package com.finance.repositories;

import com.finance.models.Instrument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
@Repository
public interface InstrumentRepository extends JpaRepository<Instrument,UUID> {
    Optional<Instrument> findInstrumentBySymbol(String symbol);

    List<Instrument> getInstrumentsByActiveTrue();
}
