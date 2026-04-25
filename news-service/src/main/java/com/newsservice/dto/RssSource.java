package com.newsservice.dto;

public record RssSource(
        String name,
        NewsCountry country,
        NewsTopic topic,
        String url
) {
}