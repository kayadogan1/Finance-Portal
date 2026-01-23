package com.newsservice.service;

import com.newsservice.dto.*;
import jakarta.annotation.PostConstruct;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.*;

@Service
public class NewsService {

    private final Logger logger = LogManager.getLogger(NewsService.class);
    private final RestClient restClient;
    @Value("${news.api.key}")
    private String API_KEY;
    @Value("${news.api.url}")
    private String API_URL;

    private final List<FilteredArticleDto> allArticles;
    public NewsService(RestClient restClient) {
        this.restClient = restClient;
        this.allArticles = new ArrayList<>();
    }

    @PostConstruct
    private void getAllArticles(){
        List<FilteredArticleDto> articles = new ArrayList<>();
        for(NewsTopic topic : NewsTopic.values()){
            for(NewsCountry country: NewsCountry.values()){
                articles.addAll(fetchArticlesFromAPI(topic,country));
            }
        }
        logger.info("Total articles fetched: {}", articles.size());
        allArticles.addAll(articles);
    }

    public List<FilteredArticleDto>  getAllArticlesList(){
        return allArticles;
    }
    public List<FilteredArticleDto> getArticlesByTopicAndCountry(NewsTopic topic , NewsCountry country){

        return allArticles.stream()
                .filter(article -> article.category().equalsIgnoreCase(topic.name()))
                .filter(article -> article.country().equalsIgnoreCase(country.name()))
                .toList();
    }
    public List<FilteredArticleDto> getArticlesByTopic(NewsTopic topic){
        return allArticles.stream()
                .filter(article -> article.category().equalsIgnoreCase(topic.name()))
                .toList();
    }
    public List<FilteredArticleDto> getArticlesByCountry(NewsCountry country){
        return allArticles.stream()
                .filter(article -> article.country().equalsIgnoreCase(country.name()))
                .toList();
    }
    public void refresh() {
        allArticles.clear();
        getAllArticles();
    }
    private List<FilteredArticleDto> fetchArticlesFromAPI(NewsTopic topic, NewsCountry country) {
        try {
            logger.info("Fetching: {} - {}", topic, country);

            NewsResponseDto response = restClient.get()
                    .uri(API_URL + "/top-headlines", uriBuilder -> uriBuilder
                            .queryParam("country", country.name().toLowerCase())
                            .queryParam("category", topic.name().toLowerCase())
                            .queryParam("apiKey", API_KEY)
                            .build())
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .onStatus(status -> status.value() == 401, (request, resp) -> {
                        logger.error("API Key invalid");
                        throw new RuntimeException("API Key invalid");
                    })
                    .onStatus(HttpStatusCode::is4xxClientError, (request, resp) -> {
                        logger.error("Client error: {}", resp.getStatusCode());
                        throw new RuntimeException("Client error");
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (request, resp) -> {
                        logger.error("Server error: {}", resp.getStatusCode());
                        throw new RuntimeException("Server error");
                    })
                    .body(NewsResponseDto.class);

            if (response != null && response.articles() != null) {
                return response.articles().stream()
                        .map(articleDto -> new FilteredArticleDto(
                                articleDto.source(),
                                articleDto.author(),
                                articleDto.title(),
                                country.name(),
                                topic.name(),
                                articleDto.description(),
                                articleDto.content(),
                                articleDto.url(),
                                articleDto.urlToImage(),
                                articleDto.publishedAt()
                        ))
                        .toList();
            }
            return new ArrayList<>();

        } catch (Exception e) {
            logger.error("Error fetching {}-{}: {}", topic, country, e.getMessage());
            return new ArrayList<>();
        }
    }



}
