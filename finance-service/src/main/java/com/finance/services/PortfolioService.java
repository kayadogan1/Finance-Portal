package com.finance.services;
import com.finance.exceptions.*;
import com.finance.models.*;
import com.finance.repositories.*;
import com.finance.shared.*;
import com.finance.shared.PortfolioItemDto;
import jakarta.transaction.Transactional;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;


@Service
public class PortfolioService {
    private static final BigDecimal COMMISSION_RATE = new BigDecimal("0");
    private static final Currency CASH_CURRENCY = Currency.TRY;
    private static final Logger logger = LogManager.getLogger(PortfolioService.class);
    private final PortfolioRepository portfolioRepository;
    private final MarketDataRepository marketDataRepository;
    private final TransactionRepository transactionRepository;
    private final InstrumentRepository instrumentRepository;
    private final UserRepository userRepository;
    private final InstrumentService instrumentService;
    public PortfolioService(InstrumentRepository instrumentRepository, PortfolioRepository portfolioRepository, MarketDataRepository marketDataRepository, TransactionRepository transactionRepository, UserRepository userRepository, InstrumentService instrumentService) {
        this.marketDataRepository = marketDataRepository;
        this.userRepository = userRepository;
        this.instrumentRepository= instrumentRepository;
        this.portfolioRepository = portfolioRepository;
        this.transactionRepository = transactionRepository;
        this.instrumentService = instrumentService;
    }

    public PortfolioReadDto getPortfolio(String userId, UUID portfolioId){
        return getPortfolio(userId, portfolioId, Currency.TRY);
    }

    public PortfolioReadDto getPortfolio(String userId, UUID portfolioId, Currency displayCurrency){
        logger.info("fetching Portfolio for {}", userId);


        return portfolioRepository.findByIdAndUserId(portfolioId,userId)
                .map(portfolio -> toPortfolioReadDto(portfolio, displayCurrency))
                .orElseThrow(() -> new RuntimeException(
                        "Error occurred while mapper entity to dto . userId=" + userId + ", portfolioId=" + portfolioId
                ));

    }
    public List<PortfolioReadDto> getUserPortfolios(String userId){
        return getUserPortfolios(userId, Currency.TRY);
    }

    public List<PortfolioReadDto> getUserPortfolios(String userId, Currency displayCurrency){
        logger.info("fetching Portfolios for {}", userId);

        return portfolioRepository.findAllByUserId(userId)
                .stream()
                .map(portfolio -> toPortfolioReadDto(portfolio, displayCurrency))
                .collect(Collectors.toList());
    }
    public List<PortfolioCurrentProfitDto> calculateCurrentPortfolioProfit(String userId, UUID portfolioId, Currency displayCurrency) {
        Portfolio portfolio = getPortfolioEntity(userId, portfolioId);
        Currency targetCurrency = normalizeCurrency(displayCurrency);
        BigDecimal usdTryRate = resolveUsdTryRate();

        return portfolio.getItems().stream()
                .filter(portfolioItem -> portfolioItem.getInstrument() != null && portfolioItem.getInstrument().getId() != null)
                .map(portfolioItem -> toPortfolioCurrentProfitDto(portfolioItem, targetCurrency, usdTryRate))
                .sorted(Comparator.comparing(
                        PortfolioCurrentProfitDto::profitLoss,
                        Comparator.nullsLast(BigDecimal::compareTo)
                ).reversed())
                .toList();
    }

    private PortfolioCurrentProfitDto toPortfolioCurrentProfitDto(PortfolioItem portfolioItem, Currency displayCurrency, BigDecimal usdTryRate) {
        Instrument instrument = portfolioItem.getInstrument();
        Currency instrumentCurrency = normalizeCurrency(instrument.getBaseCurrency());
        BigDecimal quantity = valueOrZero(portfolioItem.getQuantity());
        BigDecimal currentPriceRaw = valueOrZero(instrument.getCurrentPrice());
        BigDecimal averageCostRaw = valueOrZero(portfolioItem.getAverageCost());
        BigDecimal costValue = convertInstrumentValue(averageCostRaw.multiply(quantity), instrumentCurrency, displayCurrency, usdTryRate);
        BigDecimal currentValue = convertInstrumentValue(currentPriceRaw.multiply(quantity), instrumentCurrency, displayCurrency, usdTryRate);
        BigDecimal profitLoss = currentValue.subtract(costValue);
        BigDecimal profitLossPercent = calculatePercentage(profitLoss, costValue);

        return new PortfolioCurrentProfitDto(
                instrument.getName(),
                instrument.getSymbol(),
                instrument.getType(),
                instrumentCurrency,
                displayCurrency,
                quantity,
                convertInstrumentValue(averageCostRaw, instrumentCurrency, displayCurrency, usdTryRate),
                convertInstrumentValue(currentPriceRaw, instrumentCurrency, displayCurrency, usdTryRate),
                costValue,
                currentValue,
                profitLoss,
                profitLossPercent,
                resolveFxRate(instrumentCurrency, displayCurrency, usdTryRate)
        );
    }


    private PortfolioReadDto toPortfolioReadDto(Portfolio portfolio, Currency displayCurrency) {
        Currency targetCurrency = normalizeCurrency(displayCurrency);
        BigDecimal usdTryRate = resolveUsdTryRate();
        List<PortfolioItemDto> itemDtos = portfolio.getItems()
                .stream()
                .map(item -> toPortfolioItemDto(item, targetCurrency, usdTryRate))
                .toList();

        BigDecimal holdingsValue = itemDtos.stream()
                .map(PortfolioItemDto::currentValue)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCost = itemDtos.stream()
                .map(PortfolioItemDto::costValue)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal profitLoss = holdingsValue.subtract(totalCost);
        BigDecimal profitLossPercent = calculatePercentage(profitLoss, totalCost);

        BigDecimal cash = convertInstrumentValue(valueOrZero(portfolio.getCashBalance()), Currency.TRY, targetCurrency, usdTryRate);
        BigDecimal totalPortfolioValue = cash.add(holdingsValue);

        return PortfolioReadDto.builder()
                .id(portfolio.getId())
                .portfolioName(portfolio.getName())
                .riskTolerance(portfolio.getRiskTolerance())
                .purpose(portfolio.getPurpose())
                .portfolioItems(itemDtos)
                .portfolioBalance(cash)
                .holdingsValue(holdingsValue)
                .totalPortfolioValue(totalPortfolioValue)
                .totalCost(totalCost)
                .profitLoss(profitLoss)
                .profitLossPercent(profitLossPercent)
                .displayCurrency(targetCurrency)
                .fxRateToDisplayCurrency(resolveFxRate(Currency.TRY, targetCurrency, usdTryRate))
                .build();
    }

    private Portfolio getPortfolioEntity(String userId, UUID portfolioId) {
        return portfolioRepository.findByIdAndUserId(portfolioId,userId)
                .orElseThrow(() ->
                        new PortfolioNotFoundException("Portfolio not found for user: " + userId));
    }


    private PortfolioItemDto toPortfolioItemDto(PortfolioItem item, Currency displayCurrency, BigDecimal usdTryRate) {
        Instrument instrument = item.getInstrument();
        Currency instrumentCurrency = normalizeCurrency(instrument.getBaseCurrency());

        BigDecimal quantity = valueOrZero(item.getQuantity());
        BigDecimal avgCost = valueOrZero(item.getAverageCost());
        BigDecimal currentPrice = valueOrZero(instrument.getCurrentPrice());

        BigDecimal currentValue = convertInstrumentValue(currentPrice.multiply(quantity), instrumentCurrency, displayCurrency, usdTryRate);
        BigDecimal costValue = convertInstrumentValue(avgCost.multiply(quantity), instrumentCurrency, displayCurrency, usdTryRate);
        BigDecimal profitLoss = currentValue.subtract(costValue);
        BigDecimal profitLossPercent = calculatePercentage(profitLoss, costValue);

        InstrumentDto instrumentDto = instrumentService.toInstrumentDto(instrument);
        return new PortfolioItemDto(
                instrumentDto,
                quantity,
                avgCost,
                currentValue,
                costValue,
                profitLoss,
                profitLossPercent,
                instrument.getType(),
                displayCurrency,
                resolveFxRate(instrumentCurrency, displayCurrency, usdTryRate)
        );
    }




    public List<PieChartDto> getPortfolioChartValues(String userId, UUID portfolioId) {
        return getPortfolioChartValues(userId, portfolioId, Currency.TRY);
    }

    public List<PieChartDto> getPortfolioChartValues(String userId, UUID portfolioId, Currency displayCurrency) {
        Portfolio portfolio = getPortfolioEntity(userId, portfolioId);
        Currency targetCurrency = normalizeCurrency(displayCurrency);
        BigDecimal usdTryRate = resolveUsdTryRate();

        List<PieChartDto> slices = portfolio.getItems().stream()
                .map(item -> toInstrumentPieSlice(item, targetCurrency, usdTryRate))
                .filter(dto -> dto.totalValue().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        BigDecimal total = slices.stream()
                .map(PieChartDto::totalValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (total.compareTo(BigDecimal.ZERO) == 0) {
            return Collections.emptyList();
        }

        return slices.stream()
                .map(slice -> withPercentage(slice, total))
                .toList();
    }


    public void createPortfolio(String userId,PortfolioDto portfolio){
        logger.info("creating Portfolio {}", portfolio.portfolioName());

        User user = userRepository.findById(userId).orElseThrow(() ->{
            logger.error("user not found");
            return  new NotFoundException("User not found ");
        });
        Portfolio portfolioEntity = Portfolio.builder()
                .user(user)
                .purpose(portfolio.purpose())
                .name(portfolio.portfolioName())
                .riskTolerance(portfolio.riskTolerance())
                .cashBalance(BigDecimal.ZERO)
                .build();
        portfolioRepository.save(portfolioEntity);
        logger.info("{} with name portfolio created", portfolio.portfolioName());


    }

    public List<PieChartDto> getPortfolioTypeAllocation(String userId, UUID portfolioId, Currency displayCurrency) {
        Portfolio portfolio = getPortfolioEntity(userId, portfolioId);
        Currency targetCurrency = normalizeCurrency(displayCurrency);
        BigDecimal usdTryRate = resolveUsdTryRate();

        Map<String, AllocationAccumulator> byTypeAndMarket = new LinkedHashMap<>();
        for (PortfolioItem item : portfolio.getItems()) {
            Instrument instrument = item.getInstrument();
            Currency instrumentCurrency = normalizeCurrency(instrument.getBaseCurrency());
            Currency marketCurrency = resolveMarketCurrency(instrumentCurrency);
            BigDecimal originalValue = calculateRawItemValue(item);
            BigDecimal displayValue = convertInstrumentValue(originalValue, instrumentCurrency, targetCurrency, usdTryRate);
            if (displayValue.compareTo(BigDecimal.ZERO) <= 0) continue;

            String marketCode = marketCurrency == Currency.TRY ? "TR" : marketCurrency == Currency.USD ? "US" : "GLOBAL";
            String key = marketCode + "-" + instrument.getType().name();
            byTypeAndMarket.compute(key, (ignored, current) -> {
                AllocationAccumulator accumulator = current == null
                        ? new AllocationAccumulator(
                        marketLabel(marketCode) + " " + instrumentTypeLabel(instrument.getType()),
                        marketCode,
                        instrument.getType(),
                        marketCurrency
                )
                        : current;
                return accumulator.add(displayValue, originalValue, resolveFxRate(instrumentCurrency, targetCurrency, usdTryRate));
            });
        }

        BigDecimal total = byTypeAndMarket.values().stream()
                .map(AllocationAccumulator::displayValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (total.compareTo(BigDecimal.ZERO) == 0) {
            return Collections.emptyList();
        }

        return byTypeAndMarket.values().stream()
                .sorted(Comparator.comparing(AllocationAccumulator::displayValue).reversed())
                .map(acc -> new PieChartDto(
                        acc.label(),
                        acc.marketCode(),
                        acc.instrumentType(),
                        targetCurrency,
                        acc.displayValue(),
                        acc.displayValue()
                                .multiply(BigDecimal.valueOf(100))
                                .divide(total, 2, RoundingMode.HALF_UP),
                        acc.originalCurrency(),
                        acc.originalValue(),
                        acc.fxRateToDisplayCurrency()
                ))
                .toList();
    }

    private PieChartDto toInstrumentPieSlice(PortfolioItem item, Currency displayCurrency, BigDecimal usdTryRate) {
        Instrument instrument = item.getInstrument();
        Currency instrumentCurrency = normalizeCurrency(instrument.getBaseCurrency());
        BigDecimal originalValue = calculateRawItemValue(item);
        BigDecimal displayValue = convertInstrumentValue(originalValue, instrumentCurrency, displayCurrency, usdTryRate);

        return new PieChartDto(
                instrument.getName(),
                instrument.getSymbol(),
                instrument.getType(),
                displayCurrency,
                displayValue,
                null,
                instrumentCurrency,
                originalValue,
                resolveFxRate(instrumentCurrency, displayCurrency, usdTryRate)
        );
    }

    private PieChartDto withPercentage(PieChartDto slice, BigDecimal total) {
        return new PieChartDto(
                slice.label(),
                slice.symbol(),
                slice.instrumentType(),
                slice.currency(),
                slice.totalValue(),
                slice.totalValue()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(total, 2, RoundingMode.HALF_UP),
                slice.originalCurrency(),
                slice.originalValue(),
                slice.fxRateToDisplayCurrency()
        );
    }

    private Currency normalizeCurrency(Currency currency) {
        if (currency == null) return Currency.TRY;
        return switch (currency) {
            case USDT, XAU, XAG -> Currency.USD;
            default -> currency;
        };
    }

    private Currency resolveMarketCurrency(Currency currency) {
        Currency normalized = normalizeCurrency(currency);
        if (normalized == Currency.TRY) return Currency.TRY;
        if (normalized == Currency.USD) return Currency.USD;
        return normalized;
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

    private BigDecimal convertInstrumentValue(BigDecimal value, Currency sourceCurrency, Currency displayCurrency, BigDecimal usdTryRate) {
        return convertValue(value, sourceCurrency, displayCurrency, usdTryRate);
    }

    private BigDecimal calculateRawItemValue(PortfolioItem item) {
        return valueOrZero(item.getInstrument().getCurrentPrice())
                .multiply(valueOrZero(item.getQuantity()));
    }

    private BigDecimal calculatePercentage(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        return numerator
                .multiply(BigDecimal.valueOf(100))
                .divide(denominator, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal valueOrZero(BigDecimal value) {
        return Optional.ofNullable(value).orElse(BigDecimal.ZERO);
    }

    private String marketLabel(String marketCode) {
        return switch (marketCode) {
            case "TR" -> "TR";
            case "US" -> "US";
            default -> "Global";
        };
    }

    private String instrumentTypeLabel(InstrumentType type) {
        return switch (type) {
            case STOCK -> "Hisse";
            case VIOP -> "VİOP";
            case FUND -> "Fon";
            case BOND -> "Tahvil / Bono";
            case FOREX, FIAT -> "Döviz";
            case COMMODITY -> "Emtia";
            case CRYPTO -> "Kripto";
            case INDEX -> "Endeks";
        };
    }

    private LocalDate resolveStartDate(PortfolioRange portfolioRange){
        LocalDate today = LocalDate.now();
        return switch (portfolioRange){
            case DAILY -> today.minusDays(1);
            case WEEKLY -> today.minusWeeks(1);
            case MONTHLY -> today.minusMonths(1);
            case THREE_MONTHS -> today.minusMonths(3);
            case SIX_MONTHS -> today.minusMonths(6);
            case YEARLY -> today.minusYears(1);
            default -> throw new IllegalStateException("Unexpected value: " + portfolioRange);
        };
    }


    public List<PerformanceLineChartDto> calculatePerformanceLineChart(PortfolioRange portfolioRange, Portfolio portfolio, Currency displayCurrency) {
        Currency targetCurrency = normalizeCurrency(displayCurrency);
        BigDecimal usdTryRate = resolveUsdTryRate();
        LocalDate today = LocalDate.now();
        LocalDate startDate = (portfolioRange == PortfolioRange.ALL)
                ? portfolio.getCreatedAt().toLocalDate()
                : resolveStartDate(portfolioRange);
        Map<UUID,Map<LocalDate,BigDecimal >> priceMap = new HashMap<>();
        logger.info("transactions fetching between {} and {}", startDate, today);
        List<Transaction> transactionList = transactionRepository.findByPortfolioIdOrderByTimestampAsc(portfolio.getId());
        Set<UUID> instrumentIds = transactionList.stream()
                .filter(transaction -> transaction.getInstrument()!=null)
                .map(transaction -> transaction.getInstrument().getId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<MarketData> marketDataList =  marketDataRepository.findDailyClosingPrices(instrumentIds,startDate,today);
        logger.info("market data fetching between {} and {}", startDate, today);
        for(MarketData marketData : marketDataList){
            UUID instrumentId = marketData.getInstrument().getId();
            LocalDate date = marketData.getTimestamp().toLocalDate();
            BigDecimal price = marketData.getPrice();
            priceMap
                    .computeIfAbsent(instrumentId, k -> new HashMap<>())
                    .put(date,price);
        }

        Map<UUID,BigDecimal> quantityMap = new HashMap<>();
        Map<UUID, Currency> currencyMap = transactionList.stream()
                .filter(transaction -> transaction.getInstrument() != null && transaction.getInstrument().getId() != null)
                .collect(Collectors.toMap(
                        transaction -> transaction.getInstrument().getId(),
                        transaction -> normalizeCurrency(transaction.getInstrument().getBaseCurrency()),
                        (existing, ignored) -> existing
                ));
        for(Transaction transaction : transactionList){
            if(transaction.getTimestamp().toLocalDate().isBefore(startDate)){
                applyTransaction(quantityMap, transaction);
            }
        }
        Map<LocalDate,List<Transaction>> transactionsByDate = transactionList.stream()
                .filter(transaction -> !transaction.getTimestamp().toLocalDate().isBefore(startDate))
                .collect(Collectors.groupingBy(transaction -> transaction.getTimestamp().toLocalDate()));

        List<PerformanceLineChartDto> performanceLineChartList = new ArrayList<>();
        Map<UUID,BigDecimal> lastKnownValueMap = new HashMap<>();
        for (LocalDate date = startDate; !date.isAfter(today); date = date.plusDays(1)) {
            List<Transaction> dailyTransactions = transactionsByDate.getOrDefault(date, Collections.emptyList());
            for(Transaction transaction : dailyTransactions){
                applyTransaction(quantityMap, transaction);
            }
            BigDecimal dailyTotalValue = BigDecimal.ZERO;
            for(Map.Entry<UUID,BigDecimal> entry : quantityMap.entrySet()){
                UUID instrumentId = entry.getKey();
                BigDecimal quantity = entry.getValue();
                BigDecimal price = priceMap
                        .getOrDefault(instrumentId, Collections.emptyMap())
                        .get(date);
                if(price!=null){
                    lastKnownValueMap.put(instrumentId,price);
                }else{
                    price = lastKnownValueMap.getOrDefault(instrumentId,BigDecimal.ZERO);
                }

                BigDecimal rawValue = price.multiply(quantity);
                Currency instrumentCurrency = currencyMap.getOrDefault(instrumentId, Currency.TRY);
                dailyTotalValue = dailyTotalValue.add(convertInstrumentValue(rawValue, instrumentCurrency, targetCurrency, usdTryRate));


            }
            performanceLineChartList.add(new PerformanceLineChartDto(date,dailyTotalValue));

        }
        return performanceLineChartList;
    }
    private void applyTransaction(Map<UUID,BigDecimal> quantityMap,Transaction transaction) {
        if(transaction.getInstrument()== null) return;
        UUID instrumentId = transaction.getInstrument().getId();
        BigDecimal quantity = transaction.getQuantity();
        switch (transaction.getType()){
            case BUY -> quantityMap.merge(instrumentId, quantity, BigDecimal::add);
            case SELL -> quantityMap.merge(instrumentId, quantity.negate(), BigDecimal::add);
            default -> {}
        }

    }
    public List<PerformanceLineChartDto> getCalculatedPerformanceChartValues(String userId, UUID portfolioId, PortfolioRange range) {
        return getCalculatedPerformanceChartValues(userId, portfolioId, range, Currency.TRY);
    }

    public List<PerformanceLineChartDto> getCalculatedPerformanceChartValues(String userId, UUID portfolioId, PortfolioRange range, Currency displayCurrency) {
        Portfolio portfolio = getPortfolioEntity(userId, portfolioId);
        logger.info("calculating {} days performance line chart for :{}",range.toString(),userId);
        return calculatePerformanceLineChart(range , portfolio, displayCurrency);
    }
    public List<PortfolioReadDto> getAllPortfolios() {
        return getAllPortfolios(Currency.TRY);
    }

    public List<PortfolioReadDto> getAllPortfolios(Currency displayCurrency) {

        logger.info("fetching all portfolios");

        return portfolioRepository.findAll()
                .stream()
                .map(portfolio -> toPortfolioReadDto(portfolio, displayCurrency))
                .toList();
    }

    @Transactional
    public void sellInstrument(String userId, String instrumentSymbol, BigDecimal quantity,UUID portfolioId){
        Instrument instrument= instrumentRepository.findInstrumentBySymbol(instrumentSymbol)
                .orElseThrow(()-> new RuntimeException("Instrument not found: " + instrumentSymbol));
        logger.info("Selling {} of {} for user {}", quantity, instrumentSymbol, userId);

        BigDecimal price = instrument.getCurrentPrice();
        Currency instrumentCurrency = normalizeCurrency(instrument.getBaseCurrency());
        BigDecimal usdTryRate = resolveUsdTryRate();
        BigDecimal totalProceeds = price.multiply(quantity);
        BigDecimal totalProceedsInCashCurrency = convertInstrumentValue(totalProceeds, instrumentCurrency, CASH_CURRENCY, usdTryRate)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal commission = totalProceedsInCashCurrency.multiply(COMMISSION_RATE)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = totalProceedsInCashCurrency.subtract(commission);
        Portfolio portfolio = getPortfolioEntity(userId, portfolioId);

        PortfolioItem portfolioItem = portfolio.getItems().stream()
                .filter(item -> item.getInstrument().getSymbol().equals(instrumentSymbol))
                .findFirst()
                .orElseThrow(() -> new InstrumentNotFoundException("Instrument not held in portfolio: " + instrumentSymbol));

        if (portfolioItem.getQuantity().compareTo(quantity) < 0) {
            logger.warn("Insufficient quantity for user {}. Trying to sell: {}, Available: {}",
                    userId, quantity, portfolioItem.getQuantity());
            throw new PortfolioInsufficientException("Insufficient quantity to sell. Trying to sell: "
                    + quantity + ", Available: " + portfolioItem.getQuantity());
        }

        portfolioItem.setQuantity(portfolioItem.getQuantity().subtract(quantity));
        if (portfolioItem.getQuantity().compareTo(BigDecimal.ZERO) == 0) {
            portfolio.getItems().remove(portfolioItem);
        }

        portfolio.setCashBalance(portfolio.getCashBalance().add(totalAmount));

        Transaction transaction = Transaction.builder()
                .userId(userId)
                .portfolioId(portfolioId)
                .type(com.finance.shared.TransactionType.SELL)
                .Instrument(instrument)
                .quantity(quantity)
                .price(price)
                .commission(commission)
                .totalAmount(totalAmount)
                .timestamp(java.time.LocalDateTime.now())
                .build();

        portfolioRepository.save(portfolio);
        transactionRepository.save(transaction);
        logger.info("Sale completed for user {}: Sold {} of {} at {} each. Total Proceeds: {}, Commission: {}, New Balance: {}",
                userId, quantity, instrumentSymbol, price, totalProceeds, commission, portfolio.getCashBalance());
    }
    @Transactional
    public void buyInstrument(String userId, String instrumentSymbol, BigDecimal quantity, UUID portfolioId){
        Instrument instrument= instrumentRepository.findInstrumentBySymbol(instrumentSymbol)
                .orElseThrow(()-> new InstrumentNotFoundException(
                        "Instrument not found: " + instrumentSymbol));
        logger.info("Buying {} of {} for user {}", quantity, instrumentSymbol, userId);

        BigDecimal price = instrument.getCurrentPrice();
        Currency instrumentCurrency = normalizeCurrency(instrument.getBaseCurrency());
        BigDecimal usdTryRate = resolveUsdTryRate();
        BigDecimal totalCost = price.multiply(quantity);
        BigDecimal totalCostInCashCurrency = convertInstrumentValue(totalCost, instrumentCurrency, CASH_CURRENCY, usdTryRate)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal commission = totalCostInCashCurrency.multiply(COMMISSION_RATE)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = totalCostInCashCurrency.add(commission);
        Portfolio portfolio = getPortfolioEntity(userId, portfolioId);

        if (portfolio.getCashBalance().compareTo(totalAmount) < 0) {
            logger.warn("Insufficient balance for user {}. Required: {}, Available: {}",
                    userId, totalCost, portfolio.getCashBalance());
            throw new InsufficientBalanceException("Insufficient balance. Required: " + totalCost
                    + ", Available: " + portfolio.getCashBalance());
        }

        portfolio.setCashBalance(portfolio.getCashBalance().subtract(totalAmount));
        PortfolioItem portfolioItem = portfolio.getItems().stream()
                .filter(item -> item.getInstrument().getSymbol().equals(instrumentSymbol))
                .findFirst()
                .orElse(null);
        if(portfolioItem == null){
            portfolioItem = PortfolioItem.builder()
                    .portfolio(portfolio)
                    .instrument(instrument)
                    .quantity(quantity)
                    .averageCost(price)
                    .build();
            portfolio.getItems().add(portfolioItem);
        }
        else{
            BigDecimal oldQuantity = portfolioItem.getQuantity();
            BigDecimal oldAvgCost = portfolioItem.getAverageCost();

            BigDecimal oldTotalCost = oldAvgCost.multiply(oldQuantity);
            BigDecimal newTotalCost = price.multiply(quantity);
            BigDecimal newQuantity = oldQuantity.add(quantity);
            BigDecimal newAvgCost = (oldTotalCost.add(newTotalCost)).divide(newQuantity, 8,RoundingMode.HALF_UP);
            portfolioItem.setQuantity(newQuantity);
            portfolioItem.setAverageCost(newAvgCost);

            logger.info("Updated portfolio item for user {}: {} - Quantity: {}, Average Cost: {}",
                    userId, instrumentSymbol, newQuantity, newAvgCost);

        }
        Transaction transaction = Transaction.builder()
                .userId(userId)
                .portfolioId(portfolioId)
                .type(com.finance.shared.TransactionType.BUY)
                .Instrument(instrument)
                .quantity(quantity)
                .price(price)
                .commission(commission)
                .totalAmount(totalAmount)
                .timestamp(java.time.LocalDateTime.now())
                .build();

        portfolioRepository.save(portfolio);
        transactionRepository.save(transaction);
        logger.info("Purchase completed for user {}: Bought {} of {} at {} each. Total Cost: {}, Commission: {}, New Balance: {}",
                userId, quantity, instrumentSymbol, price, totalCost, commission, portfolio.getCashBalance());

    }

    @Transactional
    public void depositCash(String userId, BigDecimal amount, UUID portfolioId){
        Portfolio portfolio = getPortfolioEntity(userId,portfolioId);

        portfolio.setCashBalance(portfolio.getCashBalance().add(amount));
        Transaction transaction = Transaction.builder()
                .userId(userId)
                .portfolioId(portfolioId)
                .type(TransactionType.DEPOSIT)
                .quantity(BigDecimal.ZERO)
                .price(BigDecimal.ZERO)
                .commission(BigDecimal.ZERO)
                .totalAmount(amount)
                .timestamp(java.time.LocalDateTime.now())
                .build();
        transactionRepository.save(transaction);
        portfolioRepository.save(portfolio);
        logger.info("Deposited {} to user {}'s portfolio. New Balance: {}", amount, userId, portfolio.getCashBalance());
    }
}
