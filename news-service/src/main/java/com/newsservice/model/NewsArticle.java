package com.newsservice.model;


import com.newsservice.dto.NewsCountry;
import com.newsservice.dto.NewsTopic;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NewsArticle {

    private final String source;
    private final String title;
    private final String url;
    private final NewsTopic topic;
    private final NewsCountry country;
    private final String content;


    public NewsArticle(
            String title,
            String content,
            String url,
            String source,
            NewsTopic topic,
            NewsCountry country
    ) {
        this.title = title;
        this.source = source;
        this.content = content;
        this.url = url;
        this.topic = topic;
        this.country = country;
    }




}
