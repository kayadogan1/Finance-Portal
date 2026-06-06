package com.finance.models;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Domain model that represents daily portfolio snapshot data.
 */
@Entity
@Table(name = "daily_portfolio_snapshots")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DailyPortfolioSnapshot {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id", nullable = false)
    private Portfolio portfolio;

    private BigDecimal cashBalance;
    private BigDecimal totalValue;
    private BigDecimal investmentValue;
    @Column(name = "snapshot_date", nullable = false)
    private LocalDate  date;
}
