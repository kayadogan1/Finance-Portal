package com.finance.services;

import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
public class MarketDataPersistenceService {

    private final InstrumentRepository instrumentRepository;
    private final MarketDataRepository marketDataRepository;
    private final RedisCacheService redisCacheService;
    private static final Logger logger = LogManager.getLogger(MarketDataPersistenceService.class);

    public MarketDataPersistenceService(InstrumentRepository instrumentRepository,
                                        MarketDataRepository marketDataRepository,
                                        RedisCacheService redisCacheService) {
        this.instrumentRepository = instrumentRepository;
        this.marketDataRepository = marketDataRepository;
        this.redisCacheService = redisCacheService;
    }
    @Transactional
    public void saveHistoricalDataBatch(String symbol, List<BigDecimal> closes, List<Long> timestamps) {
        if (timestamps == null || closes == null || timestamps.size() != closes.size() || closes.isEmpty()) {
            logger.error("Invalid or mismatched data arrays for symbol: {}", symbol);
            return;
        }

        var instrument = instrumentRepository.findInstrumentBySymbol(symbol)
                .orElseThrow(() -> new IllegalArgumentException("Veritabanında bu sembol bulunamadı: " + symbol));

        List<MarketData> marketDataList = new ArrayList<>();

        for (int i = 0; i < closes.size(); i++) {
            LocalDate tradeTime = Instant.ofEpochSecond(timestamps.get(i))
                    .atZone(ZoneId.of("Europe/Istanbul"))
                    .toLocalDate();

            marketDataList.add(MarketData.builder()
                    .instrument(instrument)
                    .price(closes.get(i))
                    .timestamp(tradeTime.atStartOfDay())
                    .build());
        }

        marketDataRepository.saveAll(marketDataList);

        instrument.setCurrentPrice(closes.getLast());
        instrument.setLastUpdateTime(LocalDateTime.now());
        instrumentRepository.save(instrument);
        redisCacheService.save(symbol, instrument);

        logger.info("Batch inserted {} records for {}", marketDataList.size(), symbol);
    }

    @Transactional
    public void saveMarketData(String symbol, BigDecimal price) {
        var instrumentOptional = instrumentRepository.findInstrumentBySymbol(symbol);

        if (instrumentOptional.isPresent()) {
            var instrument = instrumentOptional.get();
            instrument.setCurrentPrice(price);
            instrument.setLastUpdateTime(LocalDateTime.now());
            instrumentRepository.save(instrument);

            redisCacheService.save(symbol, instrument);

            var marketDataEntry = MarketData.builder()
                    .instrument(instrument)
                    .price(price)
                    .timestamp(LocalDateTime.now())
                    .build();
            marketDataRepository.save(marketDataEntry);

            logger.info("Updated {}: {}", symbol, price);
        } else {
            logger.warn("Instrument not found in DB: {}", symbol);
        }
    }
}