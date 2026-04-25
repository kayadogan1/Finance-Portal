package com.newsservice.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
        name = "news_article_instruments",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_news_article_instruments_article_symbol",
                columnNames = {"news_article_id", "symbol"}
        )
)
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NewsArticleInstrument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "news_article_id", nullable = false)
    private NewsArticle newsArticle;

    @Column(nullable = false, length = 50)
    private String symbol;

    @Column(name = "asset_type", length = 50)
    private String assetType;

    @Column(name = "score", length = 50)
    private String score;

    @Column(name = "rank_order", nullable = false)
    private int rankOrder;

    @Column(name = "primary_match", nullable = false)
    private boolean primaryMatch;

    @Column(name = "match_source", length = 50)
    private String matchSource;
}
