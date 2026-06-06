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

/**
 * Spring Data repository for market data persistence operations.
 */
@Repository
public interface MarketDataRepository extends JpaRepository<MarketData, UUID> {


    /**
     * Finds first by instrument and timestamp before order by timestamp desc.
     *
     * @param instrument instrument value
     * @param before before value
     * @return matching first by instrument and timestamp before order by timestamp desc result
     */
    Optional<MarketData> findFirstByInstrumentAndTimestampBeforeOrderByTimestampDesc(
            Instrument instrument,
            LocalDateTime before
    );
    /**
     * Finds first by instrument symbol and timestamp greater than equal order by timestamp asc.
     *
     * @param symbol instrument symbol used to locate market data
     * @param timestamp timestamp value
     * @return matching first by instrument symbol and timestamp greater than equal order by timestamp asc result
     */
    Optional<MarketData> findFirstByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc(String symbol, LocalDateTime timestamp);
    /**
     * Finds by instrument symbol and timestamp after order by timestamp asc.
     *
     * @param symbol instrument symbol used to locate market data
     * @param timestamp timestamp value
     * @return matching by instrument symbol and timestamp after order by timestamp asc result
     */
    List<MarketData> findByInstrumentSymbolAndTimestampAfterOrderByTimestampAsc(String symbol, LocalDateTime timestamp);
    /**
     * Finds by instrument symbol and timestamp greater than equal order by timestamp asc.
     *
     * @param symbol instrument symbol used to locate market data
     * @param timestamp timestamp value
     * @return matching by instrument symbol and timestamp greater than equal order by timestamp asc result
     */
    List<MarketData> findByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc(String symbol, LocalDateTime timestamp);
    /**
     * Finds by instrument symbol order by timestamp asc.
     *
     * @param symbol instrument symbol used to locate market data
     * @return matching by instrument symbol order by timestamp asc result
     */
    List<MarketData> findByInstrumentSymbolOrderByTimestampAsc(String symbol);
    /**
     * Finds first by instrument order by timestamp desc.
     *
     * @param instrument instrument value
     * @return matching first by instrument order by timestamp desc result
     */
    Optional<MarketData> findFirstByInstrumentOrderByTimestampDesc(Instrument instrument);
    /**
     * Finds daily closing prices.
     *
     * @param instrumentIds instrument ids value
     * @param from from value
     * @param to to value
     * @return matching daily closing prices result
     */
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
