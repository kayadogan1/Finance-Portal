package com.finance.repositories;

import com.finance.models.Instrument;
import com.finance.shared.Currency;
import com.finance.shared.InstrumentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
@Repository
public interface InstrumentRepository extends JpaRepository<Instrument,UUID> {

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
    Optional<Instrument> findInstrumentBySymbol(String symbol);


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
    List<Instrument> findByIsActiveFalse();
}
