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
import java.util.Set;
import java.util.UUID;

@Repository
public interface MarketDataRepository extends JpaRepository<MarketData, UUID> {


    Optional<MarketData> findFirstByInstrumentAndTimestampBeforeOrderByTimestampDesc(
            Instrument instrument,
            LocalDateTime before
    );
    List<MarketData> findByInstrumentSymbolAndTimestampAfterOrderByTimestampAsc(String symbol, LocalDateTime timestamp);
    List<MarketData> findByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc(String symbol, LocalDateTime timestamp);
    List<MarketData> findByInstrumentSymbolOrderByTimestampAsc(String symbol);
    Optional<MarketData> findFirstByInstrumentOrderByTimestampDesc(Instrument instrument);
    @Query(
            value = """
        SELECT md.id, md.instrument_id, md.price, md.timestamp
        FROM market_data md
        INNER JOIN (
            SELECT instrument_id, MAX(timestamp) as max_ts
            FROM market_data
            WHERE instrument_id IN (:instrumentIds)
              AND DATE(timestamp) BETWEEN :from AND :to
            GROUP BY instrument_id, DATE(timestamp)
        ) latest
        ON md.instrument_id = latest.instrument_id
        AND md.timestamp = latest.max_ts
    """,
            nativeQuery = true
    )
    List<MarketData> findDailyClosingPrices(
            @Param("instrumentIds") Set<UUID> instrumentIds,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

}
