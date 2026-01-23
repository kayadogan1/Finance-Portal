package com.newsservice.dto;

import java.util.List;

public record NewsResponseDto(
        String status,
        int totalResults,
        List<ArticleDto> articles
) {}
