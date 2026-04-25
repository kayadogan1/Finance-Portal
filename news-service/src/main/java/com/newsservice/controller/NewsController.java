package com.newsservice.controller;

import com.newsservice.dto.FilteredArticleDto;
import com.newsservice.dto.NewsCountry;
import com.newsservice.dto.NewsTopic;
import com.newsservice.handling.ApiResult;
import com.newsservice.service.NewsRssService;
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

    private final NewsRssService newsRssService;
    private final static Logger logger = LogManager.getLogger(NewsController.class);
    public NewsController(NewsRssService newsRssService) {
        this.newsRssService = newsRssService;
    }

    @GetMapping
    public ResponseEntity<ApiResult<List<FilteredArticleDto>>> getNews(
            @RequestParam(required = false) NewsTopic topic,
            @RequestParam(required = false) NewsCountry country
    ) {
        logger.info("Received request for news with topic: {} and country: {}", topic, country);

        List<FilteredArticleDto> articles;

        if (topic != null && country != null) {
            articles = newsRssService.getArticlesByTopicAndCountryAfterDate(topic,country, LocalDate.now().minusWeeks(1));
        } else if (topic != null) {
            articles = newsRssService.getArticlesByTopicAfterDate(topic, LocalDate.now().minusWeeks(1));
        } else if (country != null) {
            articles = newsRssService.getArticlesByCountryAfterDate(country, LocalDate.now().minusWeeks(1));
        } else {
            articles = newsRssService.getAllArticlesAfterDate(LocalDate.now().minusWeeks(1));
        }
        return ResponseEntity.ok(ApiResult.success(articles,"all news articles fetched",200));
    }
    @PostMapping("/refresh")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResult<Void>> refreshNews() {

        logger.info("Received request to refresh news articles");
        newsRssService.refresh();
        return ResponseEntity.ok(ApiResult.success("all news updating from provider",200));
    }

    @GetMapping("/topics")
    public ResponseEntity<ApiResult<List<String>>> getTopics() {
        List<String> topics= Arrays.stream(NewsTopic.values())
                .map(Enum::toString)
                .toList();
        return ResponseEntity.ok(ApiResult.success(topics,"topics fetched",200));

    }
}
