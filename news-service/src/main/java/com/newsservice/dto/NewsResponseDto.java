package com.newsservice.dto;

import java.util.List;

/**
 * Data transfer object that carries news response dto data.
 */
public record NewsResponseDto(
        String status,
        int totalResults,
        List<ArticleDto> articles
) {}
