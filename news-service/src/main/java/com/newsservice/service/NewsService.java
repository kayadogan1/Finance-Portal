package com.newsservice.service;

import com.newsservice.dto.*;
import com.newsservice.model.NewsArticle;
import com.newsservice.repository.NewsArticleRepository;
import jakarta.annotation.PostConstruct;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@Service
public class NewsService {

    private final Logger logger = LogManager.getLogger(NewsService.class);
    private final RestClient restClient;
    private final NewsArticleRepository newsArticleRepository;
    @Value("${news.api.key}")
    private String API_KEY;
    @Value("${news.api.url}")
    private String API_URL;

    public NewsService(RestClient restClient, NewsArticleRepository newsArticleRepository) {
        this.restClient = restClient;
        this.newsArticleRepository = newsArticleRepository;
    }

    @PostConstruct
    private void getAllArticles(){
        try(var executor = Executors.newVirtualThreadPerTaskExecutor()){
            List<Future<List<FilteredArticleDto>>> futures = new ArrayList<>();
            for (NewsTopic topic : NewsTopic.values()) {
                for (NewsCountry country : NewsCountry.values()) {
                    futures.add(
                            executor.submit(() -> fetchArticlesFromAPI(topic, country))
                    );
                }
            }
            for (Future<List<FilteredArticleDto>> future : futures) {
                try {
                    List<FilteredArticleDto> articles = future.get();
                    for (FilteredArticleDto article : articles) {
                        if(!newsArticleRepository.existsByUrl(article.url())){
                            saveToDatabase(toEntity(article));
                        }
                    }
                }catch (Exception e) {
                    logger.error("Fetch task failed: {}", e.getMessage());
                }
            }
        }

        logger.info("all articles fetched.");
    }

    public List<FilteredArticleDto>  getAllArticlesList(){
        return newsArticleRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }
    public List<FilteredArticleDto> getArticlesByTopicAndCountry(NewsTopic topic, NewsCountry country) {
        return newsArticleRepository.findByTopicAndCountry(topic, country).stream()
                .map(this::toDto)
                .toList();
    }

    public List<FilteredArticleDto> getArticlesByTopic(NewsTopic topic) {
        return newsArticleRepository.findByTopic(topic).stream()
                .map(this::toDto)
                .toList();
    }

    public List<FilteredArticleDto> getArticlesByCountry(NewsCountry country) {
        return newsArticleRepository.findByCountry(country).stream()
                .map(this::toDto)
                .toList();
    }
    private FilteredArticleDto toDto(NewsArticle entity) {
        return new FilteredArticleDto(
                new Source(null, entity.getSourceName()),
                entity.getAuthorName(),
                entity.getTitle(),
                entity.getCountry().name(),
                entity.getTopic().name(),
                "",
                entity.getContent(),
                entity.getUrl(),
                "",
                entity.getPublishedDate().toString()
        );
    }
    public void refresh() {
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
    private NewsArticle toEntity(FilteredArticleDto dto) {
        return NewsArticle.builder()
                .sourceName(dto.source() != null ? dto.source().name() : "Unknown")
                .title(dto.title())
                .authorName(dto.author())
                .country(NewsCountry.valueOf(dto.country()))
                .topic(NewsTopic.valueOf(dto.category()))
                .content(dto.content())
                .url(dto.url())
                .publishedDate(dto.publishedAt() != null
                        ? ZonedDateTime.parse(dto.publishedAt()).toLocalDateTime()
                        : LocalDateTime.now())
                .build();
    }
    private void saveToDatabase(NewsArticle newsArticle) {
        newsArticleRepository.save(newsArticle);
    }
}
