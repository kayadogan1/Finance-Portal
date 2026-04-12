package com.finance.services;

import com.finance.exceptions.InstrumentNotFoundException;
import com.finance.models.Instrument;
import com.finance.repositories.InstrumentRepository;
import com.finance.shared.InstrumentDto;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

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

    public Page<InstrumentDto> getAllInstruments(int page,int size) {
        Pageable pageable = PageRequest.of(Math.max(0,Math.min(page,100)),Math.max(1,Math.min(size,30)) );
        return instrumentRepository.findAll(pageable)
                .map(this::toInstrumentDto);
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

    public InstrumentDto toInstrumentDto(Instrument instrument) {
        return new InstrumentDto(instrument.getSymbol(),instrument.getName(),instrument.getType(),instrument.getCurrentPrice());
    }
}