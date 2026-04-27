package com.finance.services;
import com.finance.models.*;
import com.finance.repositories.*;
import com.finance.shared.*;
import com.finance.shared.Currency;
import com.finance.shared.PortfolioItemDto;
import jakarta.transaction.Transactional;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;


@Service
public class PortfolioService {
    private static final BigDecimal COMMISSION_RATE = new BigDecimal("0.0025");
    private static final Logger logger = LogManager.getLogger(PortfolioService.class);
    private final PortfolioRepository portfolioRepository;
    private final MarketDataRepository marketDataRepository;
    private final TransactionRepository transactionRepository;
    private final InstrumentRepository instrumentRepository;
    private final UserRepository userRepository;
    public PortfolioService(InstrumentRepository instrumentRepository, PortfolioRepository portfolioRepository, MarketDataRepository marketDataRepository, TransactionRepository transactionRepository, UserRepository userRepository) {
        this.marketDataRepository = marketDataRepository;
        this.userRepository = userRepository;
        this.instrumentRepository= instrumentRepository;
        this.portfolioRepository = portfolioRepository;
        this.transactionRepository = transactionRepository;
    }

    public PortfolioReadDto getPortfolio(String userId,UUID portfolioId){
        logger.info("fetching Portfolio for {}", userId);


        return portfolioRepository.findByIdAndUserId(portfolioId,userId)
                .map(this::toPortfolioReadDto)
                .orElseThrow(() -> new RuntimeException(
                        "Error occurred while mapper entity to dto . userId=" + userId + ", portfolioId=" + portfolioId
                ));

    }
    public List<PortfolioReadDto> getUserPortfolios(String userId){
        logger.info("fetching Portfolios for {}", userId);

        return portfolioRepository.findAllByUserId(userId)
                .stream()
                .map(this::toPortfolioReadDto)
                .collect(Collectors.toList());

    }
    private PortfolioReadDto toPortfolioReadDto(Portfolio portfolio){
        List<PortfolioItemDto> itemDtos = portfolio.getItems()
                .stream()
                .map(this::toPortfolioItemDto)
                .toList();

        return PortfolioReadDto.builder()
                .id(portfolio.getId())
                .portfolioName(portfolio.getName())
                .riskTolerance(portfolio.getRiskTolerance())
                .purpose(portfolio.getPurpose())
                .portfolioItems(itemDtos)
                .portfolioBalance(portfolio.getCashBalance())
                .build();
    }
    private Portfolio getPortfolioEntity(String userId, UUID portfolioId) {
        return portfolioRepository.findByIdAndUserId(portfolioId,userId)
                .orElseThrow(() ->
                        new RuntimeException("Portfolio not found for user: " + userId));
    }

    private PortfolioItemDto toPortfolioItemDto(PortfolioItem item) {

        InstrumentDto instrumentDto = new InstrumentDto(
                item.getInstrument().getSymbol(),
                item.getInstrument().getName(),
                item.getInstrument().getType(),
                item.getInstrument().getCurrentPrice(),
                item.getInstrument().getPreviousPrice(),
                item.getInstrument().getBaseCurrency(),
                item.getInstrument().getBaseCurrency()== Currency.TRY ? "TR BORSA" : "US BORSA"
        );

        return new PortfolioItemDto(
                instrumentDto,
                item.getQuantity(),
                item.getAverageCost()
        );
    }



    public List<PieChartDto> getPortfolioChartValues(String userId, UUID portfolioId) {

        Portfolio portfolio = getPortfolioEntity(userId, portfolioId);
        if(portfolio == null || portfolio.getItems().isEmpty()) {
            logger.warn("portfolio not found");
            return Collections.emptyList();
        }
        return portfolio.getItems().stream()
                .map(item -> {
                    BigDecimal price = Optional.ofNullable(item.getInstrument())
                            .map(Instrument::getCurrentPrice)
                            .orElse(BigDecimal.ZERO);

                    BigDecimal quantity = Optional.ofNullable(item.getQuantity())
                            .orElse(BigDecimal.ZERO);
                   String instrumentName= Optional.ofNullable(item.getInstrument())
                            .map(Instrument::getName)
                            .orElse("Bilinmeyen Varlik");
                    return new PieChartDto(
                            instrumentName,
                            price.multiply(quantity)
                    );
                })
                .filter(pieChartDto ->pieChartDto.totalValue().compareTo(BigDecimal.ZERO) > 0)
                .toList();
    }

    public void createPortfolio(String userId,PortfolioDto portfolio){
        logger.info("creating Portfolio {}", portfolio.portfolioName());

        User user = userRepository.findById(userId).orElseThrow(() ->{
            logger.error("user not found");
            return  new RuntimeException("User not found ");
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
    public List<PerformanceLineChartDto> calculatePerformanceLineChart(PortfolioRange portfolioRange, Portfolio portfolio) {
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

                dailyTotalValue = dailyTotalValue.add(price.multiply(quantity));


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
        Portfolio portfolio = getPortfolioEntity(userId, portfolioId);
        logger.info("calculating {} days performance line chart for :{}",range.toString(),userId);
        return calculatePerformanceLineChart(range , portfolio);
    }
    public List<PortfolioReadDto> getAllPortfolios() {

        logger.info("fetching all portfolios");

        return portfolioRepository.findAll()
                .stream()
                .map(this::toPortfolioReadDto)
                .toList();
    }

    @Transactional
    public void sellInstrument(String userId, String instrumentSymbol, BigDecimal quantity,UUID portfolioId){
        Instrument instrument= instrumentRepository.findInstrumentBySymbol(instrumentSymbol)
                .orElseThrow(()-> new RuntimeException("Instrument not found: " + instrumentSymbol));
        logger.info("Selling {} of {} for user {}", quantity, instrumentSymbol, userId);

        BigDecimal price = instrument.getCurrentPrice();
        BigDecimal totalProceeds = price.multiply(quantity).setScale(2, RoundingMode.HALF_UP);
        BigDecimal commission = totalProceeds.multiply(COMMISSION_RATE)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = totalProceeds.subtract(commission);
        Portfolio portfolio = portfolioRepository.findByIdAndUserId(portfolioId,userId)
                .orElseThrow(() -> new RuntimeException("Portfolio not found for user: " + userId));

        PortfolioItem portfolioItem = portfolio.getItems().stream()
                .filter(item -> item.getInstrument().getSymbol().equals(instrumentSymbol))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Instrument not held in portfolio: " + instrumentSymbol));

        if (portfolioItem.getQuantity().compareTo(quantity) < 0) {
            logger.warn("Insufficient quantity for user {}. Trying to sell: {}, Available: {}",
                    userId, quantity, portfolioItem.getQuantity());
            throw new RuntimeException("Insufficient quantity to sell. Trying to sell: "
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
                .orElseThrow(()-> new RuntimeException("Instrument not found: " + instrumentSymbol));
        logger.info("Buying {} of {} for user {}", quantity, instrumentSymbol, userId);

        BigDecimal price = instrument.getCurrentPrice();
        BigDecimal totalCost = price.multiply(quantity).setScale(2, RoundingMode.HALF_UP);
        BigDecimal commission = totalCost.multiply(COMMISSION_RATE)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = totalCost.add(commission);
        Portfolio portfolio = portfolioRepository.findByIdAndUserId(portfolioId,userId)
                .orElseThrow(() -> new RuntimeException("Portfolio not found for user: " + userId));

        if (portfolio.getCashBalance().compareTo(totalAmount) < 0) {
            logger.warn("Insufficient balance for user {}. Required: {}, Available: {}",
                    userId, totalCost, portfolio.getCashBalance());
            throw new RuntimeException("Insufficient balance. Required: " + totalCost
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
