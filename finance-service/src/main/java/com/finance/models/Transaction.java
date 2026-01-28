package com.finance.models;

import com.finance.shared.TransactionType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@Builder
@Table(name = "transactions")
@AllArgsConstructor
@NoArgsConstructor
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;

    private TransactionType type;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instrument_id")
    private Instrument Instrument;

    private BigDecimal quantity;

    private BigDecimal price;

    private BigDecimal commission;

    private BigDecimal totalAmount;
    @Column(nullable = false)
    private LocalDateTime timestamp;
}
