package com.finance.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Domain model that represents portfolio item data.
 */
@Entity
@Data
@Builder
@Table(name = "portfolio_items")
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioItem {
    @Id
    @GeneratedValue
    private UUID id;
    @ManyToOne
    @JoinColumn(name = "portfolio_id")
    private Portfolio portfolio;

    @ManyToOne
    @JoinColumn(name = "instrument_id")
    private Instrument instrument;

    private BigDecimal quantity;

    private BigDecimal averageCost;


}
