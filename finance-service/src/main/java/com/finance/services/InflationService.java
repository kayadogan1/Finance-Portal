package com.finance.services;

import com.finance.exceptions.NotFoundException;
import com.finance.models.Inflation;
import com.finance.models.Portfolio;
import com.finance.models.Transaction;
import com.finance.repositories.InflationRepository;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.PortfolioRepository;
import com.finance.repositories.TransactionRepository;
import com.finance.shared.*;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Queue;
import java.util.UUID;

/**
 * Service component that handles inflation operations.
 */
@Service
public class InflationService {

    private final Logger logger = LogManager.getLogger(InflationService.class);
    private final InflationRepository inflationRepository ;
    private final InstrumentRepository instrumentRepository;
    private final PortfolioRepository portfolioRepository;
    private final PortfolioService portfolioService;
    private final TransactionRepository transactionRepository;
    /**
     * Creates a new InflationService with its required dependencies.
     *
     * @param inflationRepository inflation repository value
     * @param instrumentRepository instrument repository value
     * @param portfolioRepository portfolio repository value
     * @param portfolioService portfolio service value
     * @param transactionRepository transaction repository value
     */
    public InflationService(InflationRepository inflationRepository, InstrumentRepository instrumentRepository, PortfolioRepository portfolioRepository, PortfolioService portfolioService, TransactionRepository transactionRepository) {
        this.inflationRepository = inflationRepository;
        this.instrumentRepository = instrumentRepository;
        this.portfolioRepository = portfolioRepository;
        this.portfolioService = portfolioService;
        this.transactionRepository = transactionRepository;
    }

    /**
     * Calculates inflation effect in portfolio.
     *
     * @param userId identifier of the user
     * @param portfolioId identifier of the portfolio
     * @param currency currency value
     * @return calculate inflation effect in portfolio result
     */
    public PerformanceLineChartDtoWithInflationDto calculateInflationEffectInPortfolio(String userId, UUID portfolioId, Currency currency) {
        Portfolio portfolio = portfolioRepository.findByIdAndUserId(portfolioId, userId)
                .orElseThrow(() -> new NotFoundException("portfolio not found"));
        return calculateInflationEffectInPortfolio(portfolio,currency);
    }

    /**
     * Calculates inflation effect in portfolio.
     *
     * @param portfolio portfolio value
     * @param currency currency value
     * @return calculate inflation effect in portfolio result
     */
    public PerformanceLineChartDtoWithInflationDto calculateInflationEffectInPortfolio(Portfolio portfolio,Currency currency){
        Currency targetCurrency = normalizeCurrency(currency);
        BigDecimal usdTryRate = resolveUsdTryRate();
        Map<String,Queue<InstrumentLot>> lotQueueMap = new HashMap<>();
        List<Transaction> transactionList = transactionRepository.findByPortfolioIdOrderByTimestampAsc(portfolio.getId());
        PortfolioReadDto portfolioSummary = portfolioService.getPortfolio(portfolio.getUser().getId(), portfolio.getId(), targetCurrency);
        for (Transaction transaction : transactionList){
            if (transaction.getInstrument() == null || transaction.getType() == null || transaction.getTimestamp() == null) {
                continue;
            }
            if(transaction.getType()== TransactionType.BUY){
                if (transaction.getQuantity() == null || transaction.getPrice() == null) {
                    logger.warn("Skipping BUY transaction with missing quantity or price. transactionId={}", transaction.getId());
                    continue;
                }
                lotQueueMap.computeIfAbsent(transaction.getInstrument().getSymbol(), key -> new LinkedList<>())
                        .add(InstrumentLot.builder()
                                .symbol(transaction.getInstrument().getSymbol())
                                .currency(normalizeCurrency(transaction.getInstrument().getBaseCurrency()))
                                .buyDate(transaction.getTimestamp().toLocalDate())
                                .buyPrice(transaction.getPrice())
                                .remainingQuantity(transaction.getQuantity())
                                .build()
                        );
            }
            if(transaction.getType() == TransactionType.SELL){
                Queue<InstrumentLot> lotQueue = lotQueueMap.get(transaction.getInstrument().getSymbol());
                consumeLots(transaction.getQuantity(),lotQueue);
            }

        }
        BigDecimal nominalCost = BigDecimal.ZERO;
        BigDecimal inflationAdjustedCost = BigDecimal.ZERO;
        BigDecimal totalRemainingQuantity = BigDecimal.ZERO;
        for(Queue<InstrumentLot> lots : lotQueueMap.values()){
            for(InstrumentLot lot : lots ){
                BigDecimal remainingQuantity = lot.getRemainingQuantity();
                BigDecimal buyPrice = lot.getBuyPrice();

                if (remainingQuantity == null || buyPrice == null || lot.getBuyDate() == null) {
                    continue;
                }
                BigDecimal lotNominalCost = convertValue(remainingQuantity.multiply(buyPrice), lot.getCurrency(), targetCurrency, usdTryRate);
                BigDecimal inflationMultiplier = BigDecimal.valueOf(calculateCumulativeInflation(lot.getBuyDate()));
                BigDecimal lotInflationAdjustedCost = lotNominalCost.multiply(inflationMultiplier);
                nominalCost = nominalCost.add(lotNominalCost);
                inflationAdjustedCost= inflationAdjustedCost.add(lotInflationAdjustedCost);
                totalRemainingQuantity = totalRemainingQuantity.add(remainingQuantity);
            }
        }
        BigDecimal portfolioNominalCost = valueOrZero(portfolioSummary.totalCost());
        if (nominalCost.compareTo(BigDecimal.ZERO) > 0 && portfolioNominalCost.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal costScaleFactor = portfolioNominalCost.divide(nominalCost, 12, RoundingMode.HALF_UP);
            inflationAdjustedCost = inflationAdjustedCost.multiply(costScaleFactor);
            nominalCost = portfolioNominalCost;
        }
        BigDecimal currentPortfolioValue = valueOrZero(portfolioSummary.holdingsValue());
        BigDecimal nominalReturn =
                currentPortfolioValue.subtract(nominalCost);
        BigDecimal realReturn =
                currentPortfolioValue.subtract(inflationAdjustedCost);

        BigDecimal inflationImpact = inflationAdjustedCost.subtract(nominalCost);
        BigDecimal inflationRatePercent = nominalCost.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                : inflationAdjustedCost.subtract(nominalCost)
                .multiply(BigDecimal.valueOf(100))
                .divide(nominalCost,2, RoundingMode.HALF_UP);
        return PerformanceLineChartDtoWithInflationDto.builder()
                .dateTime(LocalDate.now())
                .portfolioValue(currentPortfolioValue)
                .nominalCost(nominalCost)
                .inflationAdjustedCost(inflationAdjustedCost)
                .inflationImpact(inflationImpact)
                .nominalReturn(nominalReturn)
                .realReturn(realReturn)
                .inflationRate(inflationRatePercent.doubleValue())
                .currency(targetCurrency)
                .build();

    }
    /**
     * Performs consume lots.
     *
     * @param quantity quantity value
     * @param lots lots value
     */
    private void consumeLots(BigDecimal quantity, Queue<InstrumentLot> lots){
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            logger.warn("quantity is null ");
            return;
        }

        if (lots == null || lots.isEmpty()) {
            logger.error("lots queue is empty");
            return;
        }
        BigDecimal remainingSellQuantity = quantity;
        while(remainingSellQuantity.compareTo(BigDecimal.ZERO)>0 && !lots.isEmpty() ){
            InstrumentLot oldestLot = lots.peek();
            if (oldestLot == null || oldestLot.getRemainingQuantity() == null) {
                lots.poll();
                continue;
            }
            BigDecimal remainingQuantity = oldestLot.getRemainingQuantity();

            if(oldestLot.getRemainingQuantity().compareTo(remainingSellQuantity)<=0){
                remainingSellQuantity = remainingSellQuantity.subtract(remainingQuantity);
                lots.poll();
            }
            else if (oldestLot.getRemainingQuantity().compareTo(remainingSellQuantity)>0){
                oldestLot.setRemainingQuantity(oldestLot.getRemainingQuantity().subtract(remainingSellQuantity));
                remainingSellQuantity= BigDecimal.ZERO;
            }

        }
    }

    /**
     * Calculates cumulative inflation.
     *
     * @param startDay start day value
     * @return calculate cumulative inflation result
     */
    public Double calculateCumulativeInflation(LocalDate startDay) {
        LocalDate startMonth = startDay.withDayOfMonth(1);
        List<Inflation> inflationList = inflationRepository.findByTimestampGreaterThanEqualOrderByTimestampAsc(startMonth);

        if (inflationList.isEmpty()) {
            Double lastInflationMultiplier = inflationRepository.findTopByOrderByTimestampDesc()
                    .map(Inflation::getRate)
                    .map(rate -> (rate + 100) / 100)
                    .orElse(1.0);
            LocalDate currentMonth = LocalDate.now().withDayOfMonth(1);
            long monthCount = ChronoUnit.MONTHS.between(startMonth, currentMonth);
            return Math.pow(lastInflationMultiplier, Math.max(monthCount, 1));
        }

        Double cumulativeInflation = inflationList.stream()
                .filter(inflation -> inflation.getRate() != null)
                .map(inflation -> (inflation.getRate() + 100) / 100)
                .reduce(1.0, (a, b) -> a * b);

        Inflation lastInflation = inflationList.getLast();
        if (lastInflation.getTimestamp() == null || lastInflation.getRate() == null) {
            return cumulativeInflation;
        }

        LocalDate lastInflationMonth = lastInflation.getTimestamp().withDayOfMonth(1);
        LocalDate currentMonth = LocalDate.now().withDayOfMonth(1);
        long missingMonthCount = ChronoUnit.MONTHS.between(lastInflationMonth, currentMonth);
        if (missingMonthCount <= 0) {
            return cumulativeInflation;
        }

        double lastInflationMultiplier = (lastInflation.getRate() + 100) / 100;
        return cumulativeInflation * Math.pow(lastInflationMultiplier, missingMonthCount);
    }

    /**
     * Returns the result of normalize currency.
     *
     * @param currency currency value
     * @return normalize currency result
     */
    private Currency normalizeCurrency(Currency currency) {
        if (currency == null) {
            return Currency.TRY;
        }
        return switch (currency) {
            case USDT, XAU, XAG -> Currency.USD;
            default -> currency;
        };
    }

    /**
     * Returns the result of resolve usd try rate.
     *
     * @return resolve usd try rate result
     */
    private BigDecimal resolveUsdTryRate() {
        return instrumentRepository.findInstrumentBySymbol("USDTRY")
                .or(() -> instrumentRepository.findInstrumentBySymbol("TRY"))
                .map(instrument -> valueOrZero(instrument.getCurrentPrice()))
                .filter(price -> price.compareTo(BigDecimal.ZERO) > 0)
                .orElse(BigDecimal.ONE);
    }

    /**
     * Returns the result of convert value.
     *
     * @param value value value
     * @param sourceCurrency source currency value
     * @param displayCurrency display currency value
     * @param usdTryRate usd try rate value
     * @return convert value result
     */
    private BigDecimal convertValue(BigDecimal value, Currency sourceCurrency, Currency displayCurrency, BigDecimal usdTryRate) {
        Currency source = normalizeCurrency(sourceCurrency);
        Currency target = normalizeCurrency(displayCurrency);
        BigDecimal amount = valueOrZero(value);
        if (source == target) {
            return amount;
        }
        if (source == Currency.USD && target == Currency.TRY) {
            return amount.multiply(usdTryRate);
        }
        if (source == Currency.TRY && target == Currency.USD) {
            return usdTryRate.compareTo(BigDecimal.ZERO) == 0
                    ? amount
                    : amount.divide(usdTryRate, 8, RoundingMode.HALF_UP);
        }
        return amount;
    }

    /**
     * Returns the result of value or zero.
     *
     * @param value value value
     * @return value or zero result
     */
    private BigDecimal valueOrZero(BigDecimal value) {
        return Optional.ofNullable(value).orElse(BigDecimal.ZERO);
    }


}
