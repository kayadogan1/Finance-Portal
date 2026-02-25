package com.finance.repositories;

import com.finance.models.Instrument;
import com.finance.models.MarketData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MarketDataRepository extends JpaRepository<MarketData, UUID> {

    List<MarketData> findByInstrumentSymbolAndTimestampAfterOrderByTimestampAsc(String symbol, LocalDateTime timestamp);

    Optional<MarketData> findFirstByInstrumentOrderByTimestampDesc(Instrument instrument);


}