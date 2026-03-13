package com.finance.services;

import com.finance.exceptions.InstrumentNotFoundException;
import com.finance.models.Instrument;
import com.finance.repositories.InstrumentRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class InstrumentService {

    private final InstrumentRepository instrumentRepository;
    private final RedisCacheService redisCacheService;
    private final Logger logger = LogManager.getLogger(InstrumentService.class);

    public InstrumentService(InstrumentRepository instrumentRepository, RedisCacheService redisCacheService) {
        this.instrumentRepository = instrumentRepository;
        this.redisCacheService = redisCacheService;
    }

    public List<Instrument> getAllInstruments() {
        return instrumentRepository.findAll();
    }

    public Instrument getInstrumentBySymbol(String symbol) {
        Instrument cachedInstrument = redisCacheService.get(symbol, Instrument.class);

        if (cachedInstrument != null) {
            logger.info("Cache HIT: Data found in Redis for symbol: {}", symbol);
            return cachedInstrument;
        }

        logger.warn("Cache MISS: No data in Redis for symbol: {}, checking DB...", symbol);
        Optional<Instrument> dbInstrument = instrumentRepository.findInstrumentBySymbol(symbol);

        if (dbInstrument.isPresent()) {
            redisCacheService.save(symbol, dbInstrument.get());
            logger.info("Data found in DB and saved to Redis for symbol: {}", symbol);
        }

        return dbInstrument.orElseThrow(() -> new InstrumentNotFoundException("Instrument not found in DB"));
    }
}