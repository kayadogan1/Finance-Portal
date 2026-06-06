package com.newsservice.dto;

/**
 * Data transfer object that carries article dto data.
 */
public record ArticleDto(
        Source source,
        String author,
        String title,
        String description,
        String content,
        String url,
        String urlToImage,
        String publishedAt
) {}


