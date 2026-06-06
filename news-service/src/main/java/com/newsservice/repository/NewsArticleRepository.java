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

/**
 * Spring Data repository for news article persistence operations.
 */
public interface NewsArticleRepository extends JpaRepository<NewsArticle, UUID> {

    /**
     * Finds by url.
     *
     * @param url url value
     * @return matching by url result
     */
    @EntityGraph(attributePaths = "instruments")
    Optional<NewsArticle> findByUrl(String url);

    /**
     * Finds by published date after.
     *
     * @param publishedDate published date value
     * @return matching by published date after result
     */
    @EntityGraph(attributePaths = "instruments")
    List<NewsArticle> findByPublishedDateAfter(LocalDateTime publishedDate);

    /**
     * Finds by is approved true and published date after.
     *
     * @param publishedDate published date value
     * @return matching by is approved true and published date after result
     */
    @EntityGraph(attributePaths = "instruments")
    List<NewsArticle> findByIsApprovedTrueAndPublishedDateAfter(LocalDateTime publishedDate);

    /**
     * Finds by topic and is approved true and published date after.
     *
     * @param topic topic value
     * @param date date value
     * @return matching by topic and is approved true and published date after result
     */
    @EntityGraph(attributePaths = "instruments")
    List<NewsArticle> findByTopicAndIsApprovedTrueAndPublishedDateAfter(NewsTopic topic, LocalDateTime date);

    /**
     * Finds by country and is approved true and published date after.
     *
     * @param country country value
     * @param date date value
     * @return matching by country and is approved true and published date after result
     */
    @EntityGraph(attributePaths = "instruments")
    List<NewsArticle> findByCountryAndIsApprovedTrueAndPublishedDateAfter(NewsCountry country, LocalDateTime date);

    /**
     * Finds by topic and country and is approved true and published date after.
     *
     * @param topic topic value
     * @param country country value
     * @param date date value
     * @return matching by topic and country and is approved true and published date after result
     */
    @EntityGraph(attributePaths = "instruments")
    List<NewsArticle> findByTopicAndCountryAndIsApprovedTrueAndPublishedDateAfter(NewsTopic topic, NewsCountry country, LocalDateTime date);

    /**
     * Finds by is approved false order by published date desc.
     *
     * @return matching by is approved false order by published date desc result
     */
    @EntityGraph(attributePaths = "instruments")
    List<NewsArticle> findByIsApprovedFalseOrderByPublishedDateDesc();

}
