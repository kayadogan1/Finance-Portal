package com.newsservice.repository;

import com.newsservice.dto.NewsCountry;
import com.newsservice.dto.NewsTopic;
import com.newsservice.model.NewsArticle;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NewsArticleRepository extends JpaRepository<NewsArticle, UUID> {

    @EntityGraph(attributePaths = "instruments")
    Optional<NewsArticle> findByUrl(String url);

    @EntityGraph(attributePaths = "instruments")
    List<NewsArticle> findByPublishedDateAfter(LocalDateTime publishedDate);

    @EntityGraph(attributePaths = "instruments")
    List<NewsArticle> findByTopicAndPublishedDateAfter(NewsTopic topic, LocalDateTime date);

    @EntityGraph(attributePaths = "instruments")
    List<NewsArticle> findByCountryAndPublishedDateAfter(NewsCountry country, LocalDateTime date);

    @EntityGraph(attributePaths = "instruments")
    List<NewsArticle> findByTopicAndCountryAndPublishedDateAfter(NewsTopic topic, NewsCountry country, LocalDateTime date);

}
