package com.finance.repositories;

import com.finance.models.Instrument;
import com.finance.models.MarketData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MarketDataRepository extends JpaRepository<MarketData, UUID> {

    List<MarketData> findByInstrumentSymbolAndTimestampAfterOrderByTimestampAsc(String symbol, LocalDateTime timestamp);

    Optional<MarketData> findFirstByInstrumentOrderByTimestampDesc(Instrument instrument);
    @Query(
            value = "SELECT * FROM market_data " +
                    "WHERE instrument_id = :instrumentId " +
                    "AND DATE(timestamp) = :queryDate " +
                    "ORDER BY timestamp DESC " +
                    "LIMIT 1",
            nativeQuery = true
    )
    Optional<MarketData> findLastDataOfDay(
            @Param("instrumentId") UUID instrumentId,
            @Param("queryDate") LocalDate queryDate
    );

}