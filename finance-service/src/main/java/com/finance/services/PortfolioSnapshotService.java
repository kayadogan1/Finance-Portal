package com.finance.services;

import com.finance.models.DailyPortfolioSnapshot;
import com.finance.models.Portfolio;
import com.finance.repositories.PortfolioRepository;
import com.finance.repositories.PortfolioSnapshotRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class PortfolioSnapshotService implements CommandLineRunner {

    private final PortfolioSnapshotRepository portfolioSnapshotRepository;
    private final PortfolioRepository portfolioRepository;
    public PortfolioSnapshotService(PortfolioSnapshotRepository portfolioSnapshotRepository, PortfolioRepository portfolioRepository) {
        this.portfolioSnapshotRepository = portfolioSnapshotRepository;
        this.portfolioRepository = portfolioRepository;
    }


    @Override
    public void run(String... args) {
        if(portfolioSnapshotRepository.count() == 0) {
            List<Portfolio> portfolios = portfolioRepository.findAll();
            for(Portfolio portfolio : portfolios) {
                DailyPortfolioSnapshot initialSnapshot = DailyPortfolioSnapshot.builder()
                        .portfolio(portfolio)
                        .totalValue(new BigDecimal("50000"))
                        .date(LocalDate.now().minusDays(30))
                        .build();
            }
        }
    }
}
