package com.newsservice.dto;

public record FilteredArticleDto(
        Source source,
        String author,
        String title,
        String country,
        String category,
        String description,
        String content,
        String url,
        String urlToImage,
        String publishedAt
) {
}
