package com.finance.services;

import com.finance.exceptions.NotFoundException;
import com.finance.models.Inflation;
import com.finance.models.Portfolio;
import com.finance.models.Transaction;
import com.finance.repositories.InflationRepository;
import com.finance.repositories.TransactionRepository;
import com.finance.shared.*;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
public class InflationService {

    private final Logger logger = LogManager.getLogger(InflationService.class);
    private final InflationRepository inflationRepository ;
    private final PortfolioService portfolioService;
    private final TransactionRepository transactionRepository;
    public InflationService(InflationRepository inflationRepository, PortfolioService portfolioService, TransactionRepository transactionRepository) {
        this.inflationRepository = inflationRepository;
        this.portfolioService = portfolioService;
        this.transactionRepository = transactionRepository;
    }


    public PerformanceLineChartDtoWithInflationDto calculateInflationEffectInPortfolio(Portfolio portfolio){
        Map<String,Queue<InstrumentLot>> lotQueueMap = new HashMap<>();
        List<Transaction> transactionList = transactionRepository.findByPortfolioIdOrderByTimestampAsc(portfolio.getId());
        List<PerformanceLineChartDto> dailyPortfolioPerformanceDtoList = portfolioService.calculatePerformanceLineChart(PortfolioRange.ALL,portfolio);
        PerformanceLineChartDto lastDailyPortfolioValueDto = dailyPortfolioPerformanceDtoList.getLast();
        for (Transaction transaction : transactionList){
            if(transaction.getType()== TransactionType.BUY){
                lotQueueMap.computeIfAbsent(transaction.getInstrument().getSymbol(), key -> new LinkedList<>())
                        .add(InstrumentLot.builder()
                                .symbol(transaction.getInstrument().getSymbol())
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

                if (remainingQuantity == null || buyPrice == null) {
                    continue;
                }
                BigDecimal lotNominalCost = remainingQuantity.multiply(buyPrice);
                BigDecimal inflationMultiplier = BigDecimal.valueOf(calculateCumulativeInflation(lot.getBuyDate()));
                BigDecimal lotInflationAdjustedCost = lotNominalCost.multiply(inflationMultiplier);
                nominalCost = nominalCost.add(lotNominalCost);
                inflationAdjustedCost= inflationAdjustedCost.add(lotInflationAdjustedCost);
                totalRemainingQuantity = totalRemainingQuantity.add(remainingQuantity);
            }
        }
        BigDecimal currentPortfolioValue = lastDailyPortfolioValueDto.totalPrice();
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
                .nominalReturn(nominalReturn)
                .dateTime(LocalDate.now())
                .portfolioValue(currentPortfolioValue)
                .inflationRate(inflationRatePercent.doubleValue())
                .realReturn(realReturn)
                .build();

    }
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

    public List<Inflation> getAllInflationRates(){
        return inflationRepository.findAll();
    }

    public Inflation getInflationRateByDate(LocalDate date){
        return inflationRepository.findByTimestamp(date)
                .orElseThrow(() -> new NotFoundException("inflation not found"));
    }

    public Double calculateCumulativeInflation(LocalDate startDay){

        List<Inflation> inflationList = inflationRepository.findByTimestampAfterOrderByTimestampAsc(startDay);
        return   inflationList.stream()
                .map(inflation -> (inflation.getRate()+100)/100)
                .reduce(1.0,(a,b)->a*b);
    }


}
