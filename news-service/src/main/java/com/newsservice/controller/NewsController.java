package com.newsservice.controller;

import com.newsservice.dto.FilteredArticleDto;
import com.newsservice.dto.NewsCountry;
import com.newsservice.dto.NewsTopic;
import com.newsservice.service.NewsService;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;


@RestController
@RequestMapping("/api/news")
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
            articles = newsService.getArticlesByTopicAndCountryAfterDate(topic,country, LocalDate.now().minusWeeks(1));
        } else if (topic != null) {
            articles = newsService.getArticlesByTopicAfterDate(topic, LocalDate.now().minusWeeks(1));
        } else if (country != null) {
            articles = newsService.getArticlesByCountryAfterDate(country, LocalDate.now().minusWeeks(1));
        } else {
            articles = newsService.getAllArticlesAfterDate(LocalDate.now().minusWeeks(1));
        }

        if (articles.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(articles);
    }
    @PostMapping("/refresh")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> refreshNews() {

        logger.info("Received request to refresh news articles");
        newsService.refresh();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/topics")
    public ResponseEntity<List<String>> getTopics() {
        List<String> topics= Arrays.stream(NewsTopic.values())
                .map(Enum::toString)
                .toList();
        return ResponseEntity.ok(topics);

    }
}
