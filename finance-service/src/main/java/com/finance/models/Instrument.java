package com.finance.models;

import com.finance.shared.Currency;
import com.finance.shared.InstrumentType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Builder
@Getter
@Setter
@ToString
@RequiredArgsConstructor
@Table(name = "instruments")
@AllArgsConstructor
public class Instrument {
    @Id
    @GeneratedValue
    private UUID id;
    @Column(unique = true)
    private String symbol;

    private String name;
    @Enumerated(EnumType.STRING)
    private InstrumentType type;

    private BigDecimal currentPrice;

    private BigDecimal previousPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "base_currency", nullable = false)
    private Currency baseCurrency;

    private LocalDateTime lastUpdateTime;

    private boolean isActive;
    @JoinColumn(name = "historical_data_loaded")
    private boolean historicalDataLoaded;


}
