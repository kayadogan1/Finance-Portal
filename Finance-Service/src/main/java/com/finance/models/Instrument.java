package com.finance.models;

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

    private LocalDateTime lastUpdateTime;

    private boolean isActive;



}
