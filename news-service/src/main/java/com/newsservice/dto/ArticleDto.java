package com.newsservice.dto;

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


