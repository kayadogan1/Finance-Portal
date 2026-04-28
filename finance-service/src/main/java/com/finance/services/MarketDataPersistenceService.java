package com.finance.services;

import com.finance.models.Instrument;
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
        List<BigDecimal> validCloses = new ArrayList<>();

        for (int i = 0; i < closes.size(); i++) {
            BigDecimal close = closes.get(i);

            if (close == null) {
                continue;
            }

            LocalDate tradeDate = Instant.ofEpochSecond(timestamps.get(i))
                    .atZone(ZoneId.of("Europe/Istanbul"))
                    .toLocalDate();

            validCloses.add(close);

            marketDataList.add(MarketData.builder()
                    .instrument(instrument)
                    .price(close)
                    .timestamp(tradeDate.atStartOfDay())
                    .build());
        }

        if (validCloses.isEmpty()) {
            logger.warn("No valid close data found for symbol: {}", symbol);
            return;
        }

        marketDataRepository.saveAll(marketDataList);

        var latestPrice = validCloses.getLast();
        BigDecimal previousPrice = validCloses.size() >= 2
                ? validCloses.get(validCloses.size() - 2)
                : instrument.getPreviousPrice();

        instrument.setCurrentPrice(latestPrice);
        instrument.setPreviousPrice(previousPrice);
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
            instrument.setPreviousPrice(resolvePreviousClose(instrument));
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
    private BigDecimal resolvePreviousClose(Instrument instrument) {
        LocalDate today = LocalDate.now(ZoneId.of("Europe/Istanbul"));
        LocalDateTime startOfDay = today.atStartOfDay();

        return marketDataRepository
                .findFirstByInstrumentAndTimestampBeforeOrderByTimestampDesc(
                        instrument,
                        startOfDay
                )
                .map(MarketData::getPrice)
                .orElse(instrument.getPreviousPrice());
    }


}