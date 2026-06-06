package com.newsservice.dto;

/**
 * Data transfer object that carries rss source data.
 */
public record RssSource(
        String name,
        NewsCountry country,
        NewsTopic topic,
        String url
) {
}