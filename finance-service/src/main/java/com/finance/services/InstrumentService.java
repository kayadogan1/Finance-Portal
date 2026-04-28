package com.finance.services;

import com.finance.exceptions.InstrumentNotFoundException;
import com.finance.models.Instrument;
import com.finance.repositories.InstrumentRepository;
import com.finance.shared.Currency;
import com.finance.shared.InstrumentDto;
import com.finance.shared.InstrumentType;
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

    public Page<InstrumentDto> getAllInstruments(
            String q, InstrumentType type, String market, Currency currency,
            int page, int size) {

        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.min(size, 100)
        );

        String qParam = (q == null || q.isBlank()) ? "" : q.trim();
        Currency currParam = resolveCurrencyFilter(market, currency);

        return instrumentRepository
                .searchInstruments(qParam, type, currParam, pageable)
                .map(this::toInstrumentDto);
    }

    private Currency resolveCurrencyFilter(String market, Currency currency) {
        if (currency != null) {
            return currency;
        }
        if (market == null || market.isBlank()) {
            return null;
        }
        return switch (market.trim().toUpperCase()) {
            case "TR", "TRY", "TR BORSA" -> Currency.TRY;
            case "US", "USA", "USD", "US BORSA" -> Currency.USD;
            default -> null;
        };
    }

    public Page<InstrumentDto> getMarketMovers(
            String direction,
            String market,
            InstrumentType type,
            Currency currency,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.min(size, 100)
        );

        Currency currencyFilter = resolveCurrencyFilter(market, currency);

        boolean losers = "LOSERS".equalsIgnoreCase(direction)
                || "DOWN".equalsIgnoreCase(direction)
                || "DUSENLER".equalsIgnoreCase(direction);

        Page<Instrument> result = losers
                ? instrumentRepository.findTopLosers(type, currencyFilter, pageable)
                : instrumentRepository.findTopGainers(type, currencyFilter, pageable);

        return result.map(this::toInstrumentDto);
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
        return new InstrumentDto(instrument.getSymbol(),instrument.getName(),instrument.getType(),instrument.getCurrentPrice(),instrument.getPreviousPrice(),instrument.getBaseCurrency(),instrument.getBaseCurrency()== Currency.TRY? "TR BORSA":"US BORSA",instrument.getLastUpdateTime(),instrument.isActive(),instrument.isHistoricalDataLoaded());
    }
}
