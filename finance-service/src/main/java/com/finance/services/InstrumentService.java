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

import java.util.List;
import java.util.Optional;

/**
 * Service component that handles instrument operations.
 */
@Service
public class InstrumentService {

    private final InstrumentRepository instrumentRepository;
    private final RedisCacheService redisCacheService;
    private final Logger logger = LogManager.getLogger(InstrumentService.class);

    /**
     * Creates a new InstrumentService with its required dependencies.
     *
     * @param instrumentRepository instrument repository value
     * @param redisCacheService redis cache service value
     */
    public InstrumentService(InstrumentRepository instrumentRepository, RedisCacheService redisCacheService) {
        this.instrumentRepository = instrumentRepository;
        this.redisCacheService = redisCacheService;
    }
    /**
     * Returns all instruments.
     *
     * @param q q value
     * @param type type value
     * @param market market value
     * @param currency currency value
     * @param page page value
     * @param size size value
     * @return all instruments result
     */
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

    /**
     * Returns the result of resolve currency filter.
     *
     * @param market market value
     * @param currency currency value
     * @return resolve currency filter result
     */
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

    /**
     * Returns market movers.
     *
     * @param direction direction value
     * @param market market value
     * @param type type value
     * @param currency currency value
     * @param page page value
     * @param size size value
     * @return market movers result
     */
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

    /**
     * Returns instrument by symbol.
     *
     * @param symbol instrument symbol used to locate market data
     * @return instrument by symbol result
     */
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

    /**
     * Returns inactive instruments.
     *
     * @return inactive instruments result
     */
    public List<InstrumentDto> getInactiveInstruments() {
        logger.info("fetching inactive instruments...");
        return instrumentRepository.findByIsActiveFalse()
                .stream()
                .map(this::toInstrumentDto)
                .toList();
    }

    /**
     * Updates instrument active status.
     *
     * @param symbol instrument symbol used to locate market data
     * @param active active value
     * @return update instrument active status result
     */
    public InstrumentDto updateInstrumentActiveStatus(String symbol, boolean active) {
        Instrument instrument = instrumentRepository.findInstrumentBySymbol(symbol)
                .orElseThrow(() -> new InstrumentNotFoundException("Instrument not found: " + symbol));

        instrument.setActive(active);
        Instrument savedInstrument = instrumentRepository.save(instrument);
        return toInstrumentDto(savedInstrument);
    }

    /**
     * Converts data to instrument dto.
     *
     * @param instrument instrument value
     * @return to instrument dto result
     */
    public InstrumentDto toInstrumentDto(Instrument instrument) {
        return new InstrumentDto(instrument.getSymbol(),instrument.getName(),instrument.getType(),instrument.getCurrentPrice(),instrument.getPreviousPrice(),instrument.getBaseCurrency(),instrument.getBaseCurrency()== Currency.TRY? "TR BORSA":"US BORSA",instrument.getLastUpdateTime(),instrument.isActive(),instrument.isHistoricalDataLoaded());
    }
}
