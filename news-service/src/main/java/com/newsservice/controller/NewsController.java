package com.newsservice.controller;

import com.newsservice.dto.NewsItem;
import com.newsservice.service.RssService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("api/news")
public class NewsController {

    private final RssService rssService;

    public NewsController(RssService rssService) {
        this.rssService = rssService;
    }

    @GetMapping
    public ResponseEntity<List<NewsItem>> getLatestNews(){
        List<NewsItem> items = rssService.fetchNews();
        if(items.isEmpty()){
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok().body(items);
    }

}
