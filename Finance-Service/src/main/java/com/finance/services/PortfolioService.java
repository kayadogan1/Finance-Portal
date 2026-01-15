package com.finance.services;
import com.finance.models.Instrument;
import com.finance.models.Portfolio;
import com.finance.models.PortfolioItem;
import com.finance.models.Transaction;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.PortfolioRepository;
import com.finance.repositories.TransactionRepository;
import com.finance.shared.TransactionType;
import jakarta.transaction.Transactional;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;


@Service
@Transactional
public class PortfolioService {
    private static final BigDecimal COMMISSION_RATE = new BigDecimal("0.0025");
    private static final Logger logger = LogManager.getLogger(PortfolioService.class);
    private final PortfolioRepository portfolioRepository;
    private final TransactionRepository transactionRepository;
    private final InstrumentRepository instrumentRepository;
    public PortfolioService(InstrumentRepository instrumentRepository,PortfolioRepository portfolioRepository, TransactionRepository transactionRepository){
        this.instrumentRepository= instrumentRepository;
        this.portfolioRepository = portfolioRepository;
        this.transactionRepository = transactionRepository;
    }
    public void sellInstrument(String userId, String instrumentSymbol, BigDecimal quantity){
        Instrument instrument= instrumentRepository.findInstrumentBySymbol(instrumentSymbol)
                .orElseThrow(()-> new RuntimeException("Instrument not found: " + instrumentSymbol));
        logger.info("Selling {} of {} for user {}", quantity, instrumentSymbol, userId);

        BigDecimal price = instrument.getCurrentPrice();
        BigDecimal totalProceeds = price.multiply(quantity).setScale(2, RoundingMode.HALF_UP);
        BigDecimal commission = totalProceeds.multiply(COMMISSION_RATE)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = totalProceeds.subtract(commission);
        Portfolio portfolio = portfolioRepository.findByUserId(userId)
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
    public void buyInstrument(String userId, String instrumentSymbol, BigDecimal quantity){
        Instrument instrument= instrumentRepository.findInstrumentBySymbol(instrumentSymbol)
                .orElseThrow(()-> new RuntimeException("Instrument not found: " + instrumentSymbol));
        logger.info("Buying {} of {} for user {}", quantity, instrumentSymbol, userId);

        BigDecimal price = instrument.getCurrentPrice();
        BigDecimal totalCost = price.multiply(quantity).setScale(2, RoundingMode.HALF_UP);
        BigDecimal commission = totalCost.multiply(COMMISSION_RATE)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = totalCost.add(commission);
        Portfolio portfolio = portfolioRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Portfolio not found for user: " + userId));

        if (portfolio.getCashBalance().compareTo(totalCost) < 0) {
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
    public Portfolio getOrCreatePortfolio(String userId){
        return portfolioRepository.findByUserId(userId)
                .orElseGet(()->{
                    Portfolio newPortfolio= new Portfolio();
                    newPortfolio.setUserId(userId);
                    newPortfolio.setCashBalance(BigDecimal.ZERO);
                    portfolioRepository.save(newPortfolio);
                    logger.info("Created new portfolio for user {}", userId);
                    return newPortfolio;
                });
    }
    public void depositCash(String userId, BigDecimal amount){
        Portfolio portfolio = getOrCreatePortfolio(userId);
        portfolio.setCashBalance(portfolio.getCashBalance().add(amount));
        Transaction transaction = Transaction.builder()
                .userId(userId)
                .type(TransactionType.SELL)
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
