package com.finance.models;

import com.finance.shared.PortfolioPurposeType;
import com.finance.shared.RiskTolerance;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Domain model that represents portfolio data.
 */
@Entity
@Getter
@Builder
@Setter
@ToString
@RequiredArgsConstructor
@Table(name = "portfolios")
@AllArgsConstructor
public class Portfolio {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "risk_tolerance")
    @Enumerated(EnumType.STRING)
    private RiskTolerance riskTolerance;
    @Column(name = "purpose")
    @Enumerated(EnumType.STRING)
    private PortfolioPurposeType purpose;

    private String name;

    @OneToMany(mappedBy = "portfolio", cascade = CascadeType.ALL)
    private List<PortfolioItem> items;

    private BigDecimal cashBalance= BigDecimal.ZERO;
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

}