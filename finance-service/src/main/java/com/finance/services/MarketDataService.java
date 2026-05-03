package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import com.finance.exceptions.BadRequestException;
import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import com.finance.shared.*;
import jakarta.annotation.PostConstruct;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;


@Service

public class MarketDataService {

    private final InstrumentRepository instrumentRepository;
    private final InstrumentPropertiesConfig instrumentProperties;
    private final MarketDataRepository marketDataRepository;
    private static final Logger logger = LogManager.getLogger(MarketDataService.class);
    public MarketDataService(InstrumentRepository instrumentRepository, MarketDataRepository marketDataRepository, InstrumentPropertiesConfig instrumentProperties) {
        this.instrumentRepository = instrumentRepository;
        this.marketDataRepository = marketDataRepository;
        this.instrumentProperties = instrumentProperties;
    }
    @PostConstruct
    public void initDefaultInstruments() {

            logger.info("Loading instruments from properties file..");

            saveStockInstruments(instrumentProperties.getStock());
            saveInstruments(instrumentProperties.getForex(), InstrumentType.FOREX);
            saveInstruments(instrumentProperties.getCrypto(), InstrumentType.CRYPTO);
            saveInstruments(instrumentProperties.getCommodity(), InstrumentType.COMMODITY);
            saveInstruments(instrumentProperties.getIndex(), InstrumentType.INDEX);
            saveInstruments(instrumentProperties.getFiat(), InstrumentType.FIAT);

            logger.info("Instruments loaded successfully");
    }
    private void saveStockInstruments(Map<String, Map<String, String>> stockInstruments) {
        if (stockInstruments == null || stockInstruments.isEmpty()) {
            return;
        }

        stockInstruments.forEach((exchange, symbolsMap) -> {
            Currency targetCurrency = "BIST".equalsIgnoreCase(exchange) ? Currency.TRY : Currency.USD;

            symbolsMap.forEach((symbol, name) -> {
                Optional<Instrument> existingInstrumentOpt = instrumentRepository.findInstrumentBySymbol(symbol);

                if (existingInstrumentOpt.isPresent()) {
                    boolean changed = false;

                    if (existingInstrumentOpt.get().getBaseCurrency() != targetCurrency) {
                        existingInstrumentOpt.get().setBaseCurrency(targetCurrency);
                        changed = true;
                    }
                    if (!existingInstrumentOpt.get().getName().equals(name)) {
                        existingInstrumentOpt.get().setName(name);
                        changed = true;
                    }
                    if (changed) {
                        instrumentRepository.save(existingInstrumentOpt.get());
                        logger.debug("Updated STOCK: {} -> Currency: {}", symbol, targetCurrency);
                    }

                } else {
                    Instrument newInstrument = Instrument.builder()
                            .symbol(symbol)
                            .name(name)
                            .type(InstrumentType.STOCK)
                            .baseCurrency(targetCurrency)
                            .isActive(true)
                            .build();
                    instrumentRepository.save(newInstrument);
                    logger.info("Created new STOCK: {} ({})", symbol, exchange);
                }
            });
        });
    }
    private Currency resolveBaseCurrency(String symbol,InstrumentType type) {

        return switch (type) {

            case FIAT -> Currency.valueOf(symbol.toUpperCase());

            case CRYPTO -> Currency.USDT;

            case COMMODITY, INDEX, BOND -> Currency.USD;

            case FOREX -> extractQuoteCurrency(symbol);

            default -> {
                logger.error("Unsupported or unexpected  instrumentType:{} "  ,type);
                throw new IllegalArgumentException("Unsupported instrumentType: " + type);
            }
        };
    }
    private Currency extractQuoteCurrency(String forexPair) {
        if (forexPair == null || forexPair.length() != 6) {
            logger.error("Unsupported or unexpected  forexPair:{} " , forexPair);
            return Currency.USD;
        }
        try {
            return Currency.valueOf(forexPair.substring(3, 6).toUpperCase());
        } catch (IllegalArgumentException e) {
            logger.error("unexpected  exception :{} " , e.getMessage());
            return Currency.USD;
        }
    }
    public List<CandleDto> getMarketDataHistory(String symbol, LocalDateTime fromTimestamp, TimeSlot slot) {
        if (symbol == null || symbol.isEmpty()) {
            throw new BadRequestException("Symbol can not be null or empty");
        }

        if (slot == null) {
            slot = TimeSlot.D1;
        }

        if (fromTimestamp != null && fromTimestamp.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Invalid Date format");
        }

        if(instrumentRepository.findInstrumentBySymbol(symbol).isEmpty()){
            logger.warn("Instrument with symbol {} not found when fetching market data history.", symbol);
            return List.of();
        }

        List<MarketData> rawData = fromTimestamp == null
                ? marketDataRepository.findByInstrumentSymbolOrderByTimestampAsc(symbol)
                : marketDataRepository.findByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc(symbol, fromTimestamp);

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
        if(symbol == null || symbol.isEmpty()){
            throw new BadRequestException("symbol can not empty or null");
        }
        if (from != null && from.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("invalid date . future date not valid");
        }
        List<MarketData> rawData = from == null
                ? marketDataRepository.findByInstrumentSymbolOrderByTimestampAsc(symbol)
                : marketDataRepository.findByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc(symbol, from);
        logger.info("fetching line chart data...");
        if(rawData.isEmpty()){
            logger.info("No market data found for symbol {} ", symbol);
            return List.of();
        }
        return rawData.stream()
                .map(data -> new LineChartDto(data.getTimestamp(),data.getPrice()))
                .toList();
    }

    public HypotheticalReturnDto calculateHypotheticalReturn(
            String symbol,
            LocalDate purchaseDate,
            BigDecimal quantity,
            Currency displayCurrency
    ) {
        if (symbol == null || symbol.isBlank()) {
            throw new BadRequestException("symbol can not empty or null");
        }
        if (purchaseDate == null) {
            throw new BadRequestException("purchaseDate can not be null");
        }
        if (purchaseDate.isAfter(LocalDate.now())) {
            throw new BadRequestException("purchaseDate can not be in the future");
        }
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("quantity must be greater than zero");
        }

        Instrument instrument = instrumentRepository.findInstrumentBySymbol(symbol)
                .orElseThrow(() -> new BadRequestException("Instrument not found"));

        Currency instrumentCurrency = normalizeCurrency(instrument.getBaseCurrency());
        Currency targetCurrency = displayCurrency == null ? instrumentCurrency : normalizeCurrency(displayCurrency);
        BigDecimal usdTryRate = resolveUsdTryRate();
        LocalDateTime purchaseStart = purchaseDate.atStartOfDay();

        MarketData purchaseData = marketDataRepository
                .findFirstByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc(symbol, purchaseStart)
                .orElseThrow(() -> new BadRequestException("No market data found on or after selected date"));

        BigDecimal purchasePriceRaw = Optional.ofNullable(purchaseData.getPrice()).orElse(BigDecimal.ZERO);
        BigDecimal currentPriceRaw = Optional.ofNullable(instrument.getCurrentPrice()).orElse(BigDecimal.ZERO);
        BigDecimal costValue = convertValue(purchasePriceRaw.multiply(quantity), instrumentCurrency, targetCurrency, usdTryRate);
        BigDecimal currentValue = convertValue(currentPriceRaw.multiply(quantity), instrumentCurrency, targetCurrency, usdTryRate);
        BigDecimal profitLoss = currentValue.subtract(costValue);
        BigDecimal profitLossPercent = costValue.compareTo(BigDecimal.ZERO) == 0
                ? null
                : profitLoss.multiply(BigDecimal.valueOf(100)).divide(costValue, 2, RoundingMode.HALF_UP);

        return new HypotheticalReturnDto(
                instrument.getSymbol(),
                instrument.getName(),
                instrument.getType(),
                instrumentCurrency,
                targetCurrency,
                purchaseDate,
                purchaseData.getTimestamp(),
                quantity,
                convertValue(purchasePriceRaw, instrumentCurrency, targetCurrency, usdTryRate),
                convertValue(currentPriceRaw, instrumentCurrency, targetCurrency, usdTryRate),
                costValue,
                currentValue,
                profitLoss,
                profitLossPercent,
                resolveFxRate(instrumentCurrency, targetCurrency, usdTryRate)
        );
    }


    private LocalDateTime truncateTime(LocalDateTime dateTime, TimeSlot slot) {
        return switch (slot){
            case D1 -> dateTime.toLocalDate().atStartOfDay();
            case W1 -> dateTime.toLocalDate().with(DayOfWeek.MONDAY).atStartOfDay();
            case MO1, MO6, Y1 -> dateTime.toLocalDate()
                    .withDayOfMonth(1)
                    .atStartOfDay();
            default -> {
                int intervalMinutes = slot.getMinutes();
                if (intervalMinutes >= 60) {
                    int hours = intervalMinutes / 60;
                    int currentHour = dateTime.getHour();
                    int truncatedHour = (currentHour / hours) * hours;
                    yield  dateTime.withHour(truncatedHour).withMinute(0).withSecond(0).withNano(0);
                } else {
                    int currentMinute = dateTime.getMinute();
                    int truncatedMinute = (currentMinute / intervalMinutes) * intervalMinutes;
                    yield  dateTime.withMinute(truncatedMinute).withSecond(0).withNano(0);
                }
            }
        };

    }

    private void saveInstruments(Map<String, String> instruments, InstrumentType type) {
        if (instruments == null || instruments.isEmpty()) {
            return;
        }

        instruments.forEach((symbol, name) -> {
            Optional<Instrument> existingInstrumentOpt = instrumentRepository.findInstrumentBySymbol(symbol);
            Currency targetCurrency = resolveBaseCurrency(symbol, type);

            if (existingInstrumentOpt.isPresent()) {
                Instrument existing = existingInstrumentOpt.get();
                boolean changed = false;

                if (existing.getBaseCurrency() != targetCurrency) {
                    existing.setBaseCurrency(targetCurrency);
                    changed = true;
                }
                if (!existing.getName().equals(name)) {
                    existing.setName(name);
                    changed = true;
                }
                if (changed) {
                    instrumentRepository.save(existing);
                    logger.debug("Updated Instrument: {} -> Currency: {}", symbol, targetCurrency);
                }

            } else {
                Instrument newInstrument = Instrument.builder()
                        .symbol(symbol)
                        .name(name)
                        .type(type)
                        .baseCurrency(targetCurrency)
                        .isActive(true)
                        .build();
                instrumentRepository.save(newInstrument);
                logger.info("Created new Instrument: {} - Type: {}", symbol, type);
            }
        });
    }

    private Currency normalizeCurrency(Currency currency) {
        if (currency == null) return Currency.TRY;
        return switch (currency) {
            case USDT, XAU, XAG -> Currency.USD;
            default -> currency;
        };
    }

    private BigDecimal resolveUsdTryRate() {
        return instrumentRepository.findInstrumentBySymbol("USDTRY")
                .or(() -> instrumentRepository.findInstrumentBySymbol("TRY"))
                .map(Instrument::getCurrentPrice)
                .filter(price -> price.compareTo(BigDecimal.ZERO) > 0)
                .orElse(BigDecimal.ONE);
    }

    private BigDecimal convertValue(BigDecimal value, Currency sourceCurrency, Currency displayCurrency, BigDecimal usdTryRate) {
        Currency source = normalizeCurrency(sourceCurrency);
        Currency target = normalizeCurrency(displayCurrency);
        if (value == null) return BigDecimal.ZERO;
        if (source == target) return value;
        if (source == Currency.USD && target == Currency.TRY) return value.multiply(usdTryRate);
        if (source == Currency.TRY && target == Currency.USD) {
            return usdTryRate.compareTo(BigDecimal.ZERO) == 0
                    ? value
                    : value.divide(usdTryRate, 8, RoundingMode.HALF_UP);
        }
        return value;
    }

    private BigDecimal resolveFxRate(Currency sourceCurrency, Currency displayCurrency, BigDecimal usdTryRate) {
        Currency source = normalizeCurrency(sourceCurrency);
        Currency target = normalizeCurrency(displayCurrency);
        if (source == target) return BigDecimal.ONE;
        if (source == Currency.USD && target == Currency.TRY) return usdTryRate;
        if (source == Currency.TRY && target == Currency.USD) {
            return usdTryRate.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ONE
                    : BigDecimal.ONE.divide(usdTryRate, 8, RoundingMode.HALF_UP);
        }
        return BigDecimal.ONE;
    }

}
