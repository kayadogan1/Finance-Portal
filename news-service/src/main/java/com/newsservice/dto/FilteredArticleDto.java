package com.newsservice.dto;

import java.util.List;

/**
 * Data transfer object that carries filtered article dto data.
 */
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
