package com.finance.repositories;

import com.finance.models.Instrument;
import com.finance.shared.Currency;
import com.finance.shared.InstrumentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
/**
 * Spring Data repository for instrument persistence operations.
 */
@Repository
public interface InstrumentRepository extends JpaRepository<Instrument,UUID> {

    /**
     * Returns the result of search instruments.
     *
     * @param q q value
     * @param type type value
     * @param currency currency value
     * @param pageable pageable value
     * @return search instruments result
     */
    @Query("""
    SELECT i FROM Instrument i
    WHERE (:q = '' OR LOWER(i.symbol) LIKE LOWER(CONCAT('%',:q,'%'))
                      OR LOWER(i.name)   LIKE LOWER(CONCAT('%',:q,'%')))
    AND   (:type     IS NULL OR i.type         = :type)
    AND   (:currency IS NULL OR i.baseCurrency = :currency)
    AND   i.isActive = true
""")
    Page<Instrument> searchInstruments(
            @Param("q")        String q,
            @Param("type")     InstrumentType type,
            @Param("currency") Currency currency,
            Pageable pageable
    );
    /**
     * Finds instrument by symbol.
     *
     * @param symbol instrument symbol used to locate market data
     * @return matching instrument by symbol result
     */
    Optional<Instrument> findInstrumentBySymbol(String symbol);
    /**
     * Finds by type.
     *
     * @param type type value
     * @return matching by type result
     */
    List<Instrument> findByType(InstrumentType type);

    /**
     * Finds top gainers.
     *
     * @param type type value
     * @param currency currency value
     * @param pageable pageable value
     * @return matching top gainers result
     */
    @Query("""
SELECT i FROM Instrument i
WHERE i.isActive = true
AND i.currentPrice IS NOT NULL
AND i.previousPrice IS NOT NULL
AND i.previousPrice <> 0
AND (:type IS NULL OR i.type = :type)
AND (:currency IS NULL OR i.baseCurrency = :currency)
ORDER BY ((i.currentPrice - i.previousPrice) / i.previousPrice) DESC
""")
    Page<Instrument> findTopGainers(
            @Param("type") InstrumentType type,
            @Param("currency") Currency currency,
            Pageable pageable
    );

    /**
     * Finds top losers.
     *
     * @param type type value
     * @param currency currency value
     * @param pageable pageable value
     * @return matching top losers result
     */
    @Query("""
SELECT i FROM Instrument i
WHERE i.isActive = true
AND i.currentPrice IS NOT NULL
AND i.previousPrice IS NOT NULL
AND i.previousPrice <> 0
AND (:type IS NULL OR i.type = :type)
AND (:currency IS NULL OR i.baseCurrency = :currency)
ORDER BY ((i.currentPrice - i.previousPrice) / i.previousPrice) ASC
""")
    Page<Instrument> findTopLosers(
            @Param("type") InstrumentType type,
            @Param("currency") Currency currency,
            Pageable pageable
    );
    /**
     * Finds by symbol.
     *
     * @param symbol instrument symbol used to locate market data
     * @return matching by symbol result
     */
    Optional<Instrument> findBySymbol(String symbol);
    /**
     * Finds by is active false.
     *
     * @return matching by is active false result
     */
    List<Instrument> findByIsActiveFalse();
}
