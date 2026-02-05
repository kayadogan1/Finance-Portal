package com.finance.services;

import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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