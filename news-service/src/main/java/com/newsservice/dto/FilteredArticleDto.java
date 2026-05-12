package com.newsservice.dto;

import java.util.List;

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
        String publishedAt,
        String modelName,
        String instrumentSymbol,
        Boolean isApproved,
        List<NewsInstrumentDto> instruments
) {
}
