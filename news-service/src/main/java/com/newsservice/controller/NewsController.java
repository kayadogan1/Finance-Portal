package com.newsservice.controller;

import com.newsservice.dto.FilteredArticleDto;
import com.newsservice.dto.NewsCountry;
import com.newsservice.dto.NewsTopic;
import com.newsservice.service.NewsService;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;


@RestController
@RequestMapping("api/news")
public class NewsController {

    private final NewsService newsService;
    private final static Logger logger = LogManager.getLogger(NewsController.class);
    public NewsController(NewsService newsService) {
        this.newsService = newsService;
    }

    @GetMapping
    public ResponseEntity<List<FilteredArticleDto>> getNews(
            @RequestParam(required = false) NewsTopic topic,
            @RequestParam(required = false) NewsCountry country
    ) {
        logger.info("Received request for news with topic: {} and country: {}", topic, country);

        List<FilteredArticleDto> articles;

        if (topic != null && country != null) {
            articles = newsService.getArticlesByTopicAndCountry(topic, country);
        } else if (topic != null) {
            articles = newsService.getArticlesByTopic(topic);
        } else if (country != null) {
            articles = newsService.getArticlesByCountry(country);
        } else {
            articles = newsService.getAllArticlesList();
        }

        if (articles.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(articles);
    }
    @GetMapping("/refresh")
    public ResponseEntity<Void> refreshNews() {
        logger.info("Received request to refresh news articles");
        newsService.refresh();
        return ResponseEntity.ok().build();
    }

}
