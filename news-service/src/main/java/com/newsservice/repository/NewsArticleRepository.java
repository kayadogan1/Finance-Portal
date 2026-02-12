package com.newsservice.repository;

import com.newsservice.dto.NewsCountry;
import com.newsservice.dto.NewsTopic;
import com.newsservice.model.NewsArticle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface NewsArticleRepository extends JpaRepository<NewsArticle, UUID> {

    boolean existsByUrl(String url);

    List<NewsArticle> findByTopic(NewsTopic topic);
    List<NewsArticle> findByCountry(NewsCountry country);
    List<NewsArticle> findByTopicAndCountry(NewsTopic topic, NewsCountry country);
    List<NewsArticle> findByPublishedDateAfter(LocalDateTime publishedDate);
    List<NewsArticle> findByTopicAndPublishedDateAfter(NewsTopic topic, LocalDateTime date);
    List<NewsArticle> findByCountryAndPublishedDateAfter(NewsCountry country, LocalDateTime date);
    List<NewsArticle> findByTopicAndCountryAndPublishedDateAfter(NewsTopic topic, NewsCountry country, LocalDateTime date);

}
