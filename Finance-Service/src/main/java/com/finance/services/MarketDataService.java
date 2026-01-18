package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import com.finance.shared.InstrumentType;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MarketDataService {

    private final InstrumentRepository instrumentRepository;
    private final InstrumentPropertiesConfig instrumentProperties;
    private final MarketDataRepository marketDataRepository;
    private static final Logger logger = LogManager.getLogger(MarketDataService.class);
    @PostConstruct
    public void initDefaultInstruments() {
        if (instrumentRepository.count() == 0) {
            logger.info("Database is empty, initializing default instruments");
            logger.info("Loading instruments from properties file..");

            saveInstruments(instrumentProperties.getStock(), InstrumentType.STOCK);
            saveInstruments(instrumentProperties.getForex(), InstrumentType.FOREX);
            saveInstruments(instrumentProperties.getCrypto(), InstrumentType.CRYPTO);
            saveInstruments(instrumentProperties.getCommodity(), InstrumentType.COMMODITY);
            saveInstruments(instrumentProperties.getIndex(), InstrumentType.INDEX);
            saveInstruments(instrumentProperties.getBond(), InstrumentType.BOND);
            saveInstruments(instrumentProperties.getFiat(), InstrumentType.FIAT);

            logger.info("Instruments loaded successfully");
        }
    }
    public List<MarketData> getMarketDataHistory(String symbol, LocalDateTime fromTimestamp) {

        if(instrumentRepository.findInstrumentBySymbol(symbol).isEmpty()){
            logger.warn("Instrument with symbol {} not found when fetching market data history.", symbol);
            return List.of();
        }
        return marketDataRepository.findByInstrumentSymbolAndTimestampAfterOrderByTimestampAsc(symbol, fromTimestamp);
    }
    private void saveInstruments(Map<String, String> instruments, InstrumentType type) {
        if (instruments == null || instruments.isEmpty()) {
            logger.warn("No instruments found for type: {}", type);
            return;
        }

        instruments.forEach((symbol, name) -> {
            if (instrumentRepository.findInstrumentBySymbol(symbol).isEmpty()) {
                Instrument instrument = Instrument.builder()
                        .symbol(symbol)
                        .name(name)
                        .type(type)
                        .isActive(true)
                        .build();
                instrumentRepository.save(instrument);
                logger.debug("Saved instrument: {} - {}", symbol, name);
            }
        });
    }
}