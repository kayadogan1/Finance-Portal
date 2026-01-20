package com.newsservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NewsItem {

    private String title;
    private String link;
    private String content;
    private String description;
    private String publishedAt;
    private String category;
    private String source;
    private String imageUrl;


}
