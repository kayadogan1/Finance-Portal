package com.finance.models;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@ToString
@RequiredArgsConstructor
@Table(name = "portfolios")
public class Portfolio {
    @Id
    @GeneratedValue()
    private UUID id;

    private String userId;

    private String name;

    @OneToMany(mappedBy = "portfolio", cascade = CascadeType.ALL)
    private List<PortfolioItem> items;



}