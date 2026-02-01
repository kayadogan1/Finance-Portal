package com.finance.services;
import com.finance.models.*;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.PortfolioRepository;
import com.finance.repositories.PortfolioSnapshotRepository;
import com.finance.repositories.TransactionRepository;
import com.finance.shared.PerformanceLineChartDto;
import com.finance.shared.PieChartDto;
import com.finance.shared.TransactionType;
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
    private final PortfolioSnapshotRepository portfolioSnapshotRepository;
    public PortfolioService(InstrumentRepository instrumentRepository,PortfolioRepository portfolioRepository, TransactionRepository transactionRepository, PortfolioSnapshotRepository portfolioSnapshotRepository) {
        this.portfolioSnapshotRepository = portfolioSnapshotRepository;
        this.instrumentRepository= instrumentRepository;
        this.portfolioRepository = portfolioRepository;
        this.transactionRepository = transactionRepository;
    }

    public Portfolio getPortfolio(String userId,UUID portfolioId){
        logger.info("fetching Portfolio for {}", userId);
        Optional<Portfolio> portfolio = portfolioRepository.findByIdAndUserId(portfolioId,userId);
        return portfolio.orElseThrow(() -> new RuntimeException("Portfolio not found for user and portfolio id: " + userId + portfolioId) );
    }
    public List<PieChartDto> getPieChartValues(String userId, UUID portfolioId){
        logger.info("getPieChartValues  for user and portfolio {} : {}", userId, portfolioId);
        Portfolio portfolio = getPortfolio(userId,portfolioId);
        List<PieChartDto> pieChartDtos = portfolio.getItems().stream().map(item -> new PieChartDto(item.getInstrument().getName(), item.getInstrument().getCurrentPrice())).collect(Collectors.toList());
        return pieChartDtos;
    }

    public List<PerformanceLineChartDto> getPerformanceLineChartValues(String userId, UUID portfolioId, int backDays) {
        logger.info("getPerformanceLineChartValues for user, portfolio and back days: {} : {} : {}", userId, portfolioId,backDays);
        Portfolio portfolio = getPortfolio(userId,portfolioId);
        LocalDate endDate = LocalDate.now();
        LocalDate startTime = endDate.minusDays(backDays);
        List<DailyPortfolioSnapshot> dbSnapshots = portfolioSnapshotRepository.findByPortfolioIdAndDateAfterOrderByDateAsc(portfolioId,startTime);
        BigDecimal lastKnownValue = dbSnapshots.getFirst().getTotalValue();
        List<PerformanceLineChartDto> performanceLineChartDtos = new ArrayList<>();
        if(dbSnapshots.isEmpty()){
            return performanceLineChartDtos;
        }
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
    public List<Portfolio> getAllPortfolios(){
        logger.info("fetching all Portfolios");
        return portfolioRepository.findAll();
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
            portfolioItem = portfolioItem.builder()
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
        Portfolio portfolio = getPortfolio(userId,portfolioId);
        if (portfolio == null) {
            logger.error("Portfolio not found for user {} and portfolio id: {}", userId, portfolioId);
            throw new RuntimeException("Portfolio not found for user " + userId + " and portfolio id: " + portfolioId);
        }

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
