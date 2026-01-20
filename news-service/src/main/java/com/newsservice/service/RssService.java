package com.newsservice.service;

import com.newsservice.config.NewsPropertiesConfig;
import com.newsservice.dto.NewsItem;
import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.util.ArrayList;
import java.util.List;

@Service
public class RssService {

    private final NewsPropertiesConfig newsPropertiesConfig;
    public RssService(NewsPropertiesConfig newsPropertiesConfig) {
        this.newsPropertiesConfig = newsPropertiesConfig;
    }
    public List<NewsItem> fetchNews() {
        List<NewsItem> newsItems = new ArrayList<>();
        try {
            URL url = new URL(newsPropertiesConfig.getUrl());
            SyndFeedInput input = new SyndFeedInput();
            SyndFeed feed = input.build(new XmlReader(url));
            for (SyndEntry entry : feed.getEntries().stream().limit(20).toList()) {

                NewsItem news = NewsItem.builder()
                        .title(entry.getTitle())
                        .link(entry.getLink())
                        .description(entry.getDescription() != null ? entry.getDescription().getValue() : "")
                        .publishedAt(entry.getPublishedDate() != null ? entry.getPublishedDate().toString() : "")
                        .source("TRT Haber")
                        .build();

                newsItems.add(news);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return newsItems;
    }

}
