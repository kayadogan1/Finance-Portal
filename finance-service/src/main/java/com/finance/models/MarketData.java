package com.finance.models;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Domain model that represents market data data.
 */
@Entity
@Getter
@Builder
@Setter
@RequiredArgsConstructor
@Table(name = "market_data")
@AllArgsConstructor
public class MarketData {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instrument_id")
    private Instrument instrument;

    private BigDecimal price;

    private LocalDateTime timestamp = LocalDateTime.now();

}
