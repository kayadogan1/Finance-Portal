package com.newsservice.model;


import com.newsservice.dto.NewsCountry;
import com.newsservice.dto.NewsTopic;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

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







}
