package com.newsservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;


@JsonIgnoreProperties(ignoreUnknown = true)
public record NewsItem(
        @JacksonXmlProperty(localName = "description")
        String description,

        @JacksonXmlProperty(localName = "link")
        String link,

        @JacksonXmlProperty(localName = "pubDate")
        String pubDate,

        @JacksonXmlProperty(localName = "title")
        String title,

        @JacksonXmlProperty(localName = "content")
        MediaContent mediaContent
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MediaContent(
            @JacksonXmlProperty(localName = "url", isAttribute = true)
            String url
    ) {
    }
}
