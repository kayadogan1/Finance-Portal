package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import com.finance.shared.CandleDto;
import com.finance.shared.InstrumentType;
import com.finance.shared.LineChartDto;
import com.finance.shared.TimeSlot;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
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
    public List<CandleDto> getMarketDataHistory(String symbol, LocalDateTime fromTimestamp,TimeSlot slot) {

        if(instrumentRepository.findInstrumentBySymbol(symbol).isEmpty()){
            logger.warn("Instrument with symbol {} not found when fetching market data history.", symbol);
            return List.of();
        }
        List<MarketData> rawData = marketDataRepository.findByInstrumentSymbolAndTimestampAfterOrderByTimestampAsc(symbol, fromTimestamp);
        if(rawData.isEmpty()){
            logger.warn("No market data found for symbol {} ", symbol);
            return List.of();
        }

        List<CandleDto> candleDtoList = new ArrayList<>();

        MarketData firstMarketData = rawData.getFirst();
        LocalDateTime currentCandleTime = truncateTime(firstMarketData.getTimestamp(),slot);

        BigDecimal open = firstMarketData.getPrice();
        BigDecimal high = firstMarketData.getPrice();
        BigDecimal low = firstMarketData.getPrice();
        BigDecimal close = firstMarketData.getPrice();

        for (MarketData data : rawData) {
            LocalDateTime dateTime = data.getTimestamp();
            LocalDateTime bucketTime = truncateTime(dateTime, slot);
            if(bucketTime.equals(currentCandleTime)){
                if(data.getPrice().compareTo(high)>0) high = data.getPrice();
                if(data.getPrice().compareTo(low)<0) low = data.getPrice();
                close = data.getPrice();

            }
            else{
                candleDtoList.add(new CandleDto(currentCandleTime,open,high,low,close));
                currentCandleTime = bucketTime;
                open = data.getPrice();
                high = data.getPrice();
                low = data.getPrice();
                close = data.getPrice();
            }

        }

        candleDtoList.add(new CandleDto(currentCandleTime, open, high, low, close));
        logger.info("totally {} candle found", candleDtoList.size());
        return candleDtoList;
    }
    public List<LineChartDto> getLineChartDataFrom(String symbol, LocalDateTime from){
        List<MarketData> rawData = marketDataRepository.findByInstrumentSymbolAndTimestampAfterOrderByTimestampAsc(symbol, from);
        logger.info("fetching line chart data...");
        if(rawData.isEmpty()){
            logger.info("No market data found for symbol {} ", symbol);
            return List.of();
        }
        return rawData.stream()
                .map(data -> new LineChartDto(data.getTimestamp(),data.getPrice()))
                .toList();
    }


    private LocalDateTime truncateTime(LocalDateTime dateTime, TimeSlot slot) {
        int intervalMinutes = slot.getMinutes();

        if (intervalMinutes >= 60) {
            int hours = intervalMinutes / 60;
            int currentHour = dateTime.getHour();
            int truncatedHour = (currentHour / hours) * hours;
            return dateTime.withHour(truncatedHour).withMinute(0).withSecond(0).withNano(0);
        } else {
            int currentMinute = dateTime.getMinute();
            int truncatedMinute = (currentMinute / intervalMinutes) * intervalMinutes;
            return dateTime.withMinute(truncatedMinute).withSecond(0).withNano(0);
        }
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