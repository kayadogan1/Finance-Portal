package com.newsservice.model;


import com.newsservice.dto.NewsCountry;
import com.newsservice.dto.NewsTopic;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Domain model that represents news article data.
 */
@Entity
@Table(name = "news_articles")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NewsArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "author_name")
    private String authorName;
    @Column(name = "source_name",nullable = false)
    private  String sourceName;
    @Column(columnDefinition = "TEXT")
    private  String title;
    @Column(unique = true,columnDefinition = "TEXT")
    private  String url;
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private  NewsTopic topic;
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private  NewsCountry country;
    @Column(columnDefinition = "TEXT")
    private  String content;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(name = "url_to_image",columnDefinition = "TEXT")
    private String urlToImage;
    @Column(name = "published_date")
    private LocalDateTime publishedDate;
    @Column(name = "model_name")
    private String modelName;
    @Column(name = "instrument_symbol")
    private String instrumentSymbol;
    @Column(name = "is_approved")
    private boolean isApproved;


    @Builder.Default
    @OneToMany(mappedBy = "newsArticle", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<NewsArticleInstrument> instruments = new ArrayList<>();
}
