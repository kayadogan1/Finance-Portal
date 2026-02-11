package com.finance.services;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;


@Service
public class PortfolioService {
    private static final BigDecimal COMMISSION_RATE = new BigDecimal("0.0025");
    private static final Logger logger = LogManager.getLogger(PortfolioService.class);
    private final PortfolioRepository portfolioRepository;
    private final TransactionRepository transactionRepository;
    private final InstrumentRepository instrumentRepository;
    private final UserRepository userRepository;
    private final PortfolioSnapshotRepository portfolioSnapshotRepository;
    public PortfolioService(InstrumentRepository instrumentRepository,PortfolioRepository portfolioRepository, TransactionRepository transactionRepository, PortfolioSnapshotRepository portfolioSnapshotRepository, UserRepository userRepository) {
        this.portfolioSnapshotRepository = portfolioSnapshotRepository;
        this.userRepository = userRepository;
        this.instrumentRepository= instrumentRepository;
        this.portfolioRepository = portfolioRepository;
        this.transactionRepository = transactionRepository;
    }

    public PortfolioDto getPortfolio(String userId,UUID portfolioId){
        logger.info("fetching Portfolio for {}", userId);


        return portfolioRepository.findByIdAndUserId(portfolioId,userId)
                .map(this::toPortfolioDto)
                .orElseThrow(() -> new RuntimeException(
                        "Portfolio not found. userId=" + userId + ", portfolioId=" + portfolioId
                ));
    }
    private PortfolioDto toPortfolioDto(Portfolio portfolio) {

        List<PortfolioItemDto> itemDtos = portfolio.getItems()
                .stream()
                .map(this::toPortfolioItemDto)
                .toList();

        return PortfolioDto.builder()
                .portfolioName(portfolio.getName())
                .riskTolerance(portfolio.getRiskTolerance())
                .purpose(portfolio.getPurpose())
                .portfolioItems(itemDtos)
                .build();
    }
    private Portfolio getPortfolioEntity(String userId, UUID portfolioId) {
        return portfolioRepository.findByIdAndUserId(portfolioId, userId)
                .orElseThrow(() ->
                        new RuntimeException("Portfolio not found for user: " + userId));
    }

    private PortfolioItemDto toPortfolioItemDto(PortfolioItem item) {

        InstrumentDto instrumentDto = new InstrumentDto(
                item.getInstrument().getSymbol(),
                item.getInstrument().getName(),
                item.getInstrument().getType(),
                item.getInstrument().getCurrentPrice()
        );

        return new PortfolioItemDto(
                instrumentDto,
                item.getQuantity(),
                item.getAverageCost()
        );
    }

    public boolean createPortfolio(String userId,PortfolioDto portfolio){
        logger.info("creating Portfolio {}", portfolio.portfolioName());

        User user = userRepository.findById(userId).orElseThrow(() ->{
            logger.error("user not found");
            return  new RuntimeException("User not found");
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
        return true;

    }
    public List<PieChartDto> getPieChartValues(String userId, UUID portfolioId){
        logger.info("getPieChartValues  for user and portfolio {} : {}", userId, portfolioId);
        Portfolio portfolio = getPortfolioEntity(userId,portfolioId);
        return portfolio.getItems().stream().map(item -> new PieChartDto(item.getInstrument().getName(), item.getInstrument().getCurrentPrice())).collect(Collectors.toList());
    }

    public List<PerformanceLineChartDto> getPerformanceLineChartValues(String userId, UUID portfolioId, int backDays) {
        logger.info("getPerformanceLineChartValues for user, portfolio and back days: {} : {} : {}", userId, portfolioId,backDays);
        LocalDate endDate = LocalDate.now();
        LocalDate startTime = endDate.minusDays(backDays);
        List<PerformanceLineChartDto> performanceLineChartDtos = new ArrayList<>();
        List<DailyPortfolioSnapshot> dbSnapshots = portfolioSnapshotRepository.findByPortfolioIdAndDateAfterOrderByDateAsc(portfolioId,startTime);
        if(dbSnapshots.isEmpty()){
            return performanceLineChartDtos;
        }
        BigDecimal lastKnownValue = dbSnapshots.getFirst().getTotalValue();

        for(LocalDate date = startTime; !date.isAfter(endDate); date = date.plusDays(1)) {
            LocalDate currentDate = date;
            Optional<DailyPortfolioSnapshot> foundSnapshot = dbSnapshots.stream()
                    .filter(s -> s.getDate().equals(currentDate))
                    .findFirst();
            if(foundSnapshot.isPresent()){
                lastKnownValue = lastKnownValue.add(foundSnapshot.get().getTotalValue());
            }
            performanceLineChartDtos.add(new PerformanceLineChartDto(date,lastKnownValue));

        }
        return performanceLineChartDtos;

    }
    public List<PortfolioDto> getAllPortfolios() {

        logger.info("fetching all portfolios");

        return portfolioRepository.findAll()
                .stream()
                .map(portfolio -> {

                    List<PortfolioItemDto> itemDtoList = portfolio.getItems()
                            .stream()
                            .map(item -> new PortfolioItemDto(
                                    new InstrumentDto(
                                            item.getInstrument().getSymbol(),
                                            item.getInstrument().getName(),
                                            item.getInstrument().getType(),
                                            item.getInstrument().getCurrentPrice()
                                    ),
                                    item.getQuantity(),
                                    item.getAverageCost()
                            ))
                            .toList();

                    return PortfolioDto.builder()
                            .portfolioName(portfolio.getName())
                            .riskTolerance(portfolio.getRiskTolerance())
                            .purpose(portfolio.getPurpose())
                            .portfolioItems(itemDtoList)
                            .build();
                })
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
