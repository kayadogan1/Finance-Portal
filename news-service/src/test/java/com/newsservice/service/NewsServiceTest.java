package com.newsservice.service;

import com.newsservice.dto.*;
import com.newsservice.model.NewsArticle;
import com.newsservice.repository.NewsArticleRepository;
import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NewsServiceTest {

    @Mock
    private RestClient restClient;

    @Mock
    private NewsArticleRepository newsArticleRepository;

    @Mock
    private Tracer tracer;

    @InjectMocks
    private NewsService newsService;

    private NewsArticle createMockArticle() {
        return NewsArticle.builder()
                .id(UUID.randomUUID())
                .sourceName("Test Source")
                .authorName("Test Author")
                .title("Test Title")
                .description("Test Description")
                .content("Test Content")
                .url("https://test.com")
                .urlToImage("https://test.com/image.png")
                .publishedDate(LocalDateTime.now())
                .country(NewsCountry.US)
                .topic(NewsTopic.BUSINESS)
                .build();
    }

    @Test
    void getAllArticlesAfterDate_whenArticlesExist_returnsFilteredDtoList() {
        // Arrange
        LocalDate date = LocalDate.now().minusDays(1);
        NewsArticle article = createMockArticle();
        when(newsArticleRepository.findByPublishedDateAfter(any(LocalDateTime.class)))
                .thenReturn(Arrays.asList(article));

        // Act
        List<FilteredArticleDto> result = newsService.getAllArticlesAfterDate(date);

        // Assert
        assertEquals(1, result.size());
        assertEquals("Test Title", result.get(0).title());
        assertEquals("BUSINESS", result.get(0).category());
        assertEquals("US", result.get(0).country());
        verify(newsArticleRepository).findByPublishedDateAfter(date.atStartOfDay());
    }

    @Test
    void getAllArticlesAfterDate_whenNoArticles_returnsEmptyList() {
        // Arrange
        LocalDate date = LocalDate.now().minusDays(1);
        when(newsArticleRepository.findByPublishedDateAfter(any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // Act
        List<FilteredArticleDto> result = newsService.getAllArticlesAfterDate(date);

        // Assert
        assertTrue(result.isEmpty());
        verify(newsArticleRepository).findByPublishedDateAfter(date.atStartOfDay());
        verifyNoMoreInteractions(newsArticleRepository);
    }

    @Test
    void getArticlesByTopicAfterDate_whenValidTopic_returnsList() {
        // Arrange
        LocalDate date = LocalDate.now().minusDays(1);
        NewsTopic topic = NewsTopic.TECHNOLOGY;
        NewsArticle article = createMockArticle();
        article.setTopic(topic);
        
        when(newsArticleRepository.findByTopicAndPublishedDateAfter(eq(topic), any(LocalDateTime.class)))
                .thenReturn(Arrays.asList(article));

        // Act
        List<FilteredArticleDto> result = newsService.getArticlesByTopicAfterDate(topic, date);

        // Assert
        assertEquals(1, result.size());
        assertEquals("TECHNOLOGY", result.get(0).category());
        verify(newsArticleRepository).findByTopicAndPublishedDateAfter(topic, date.atStartOfDay());
    }

    @Test
    void getArticlesByCountryAfterDate_whenValidCountry_returnsList() {
        // Arrange
        LocalDate date = LocalDate.now().minusDays(1);
        NewsCountry country = NewsCountry.TR;
        NewsArticle article = createMockArticle();
        article.setCountry(country);

        when(newsArticleRepository.findByCountryAndPublishedDateAfter(eq(country), any(LocalDateTime.class)))
                .thenReturn(Arrays.asList(article));

        // Act
        List<FilteredArticleDto> result = newsService.getArticlesByCountryAfterDate(country, date);

        // Assert
        assertEquals(1, result.size());
        assertEquals("TR", result.get(0).country());
        verify(newsArticleRepository).findByCountryAndPublishedDateAfter(country, date.atStartOfDay());
    }

    @Test
    void getArticlesByTopicAndCountryAfterDate_whenBothMatch_returnsList() {
        // Arrange
        LocalDate date = LocalDate.now().minusDays(1);
        NewsTopic topic = NewsTopic.FINANCE;
        NewsCountry country = NewsCountry.UK;
        NewsArticle article = createMockArticle();
        article.setTopic(topic);
        article.setCountry(country);

        when(newsArticleRepository.findByTopicAndCountryAndPublishedDateAfter(eq(topic), eq(country), any(LocalDateTime.class)))
                .thenReturn(Arrays.asList(article));

        // Act
        List<FilteredArticleDto> result = newsService.getArticlesByTopicAndCountryAfterDate(topic, country, date);

        // Assert
        assertEquals(1, result.size());
        assertEquals("FINANCE", result.get(0).category());
        assertEquals("UK", result.get(0).country());
        verify(newsArticleRepository).findByTopicAndCountryAndPublishedDateAfter(topic, country, date.atStartOfDay());
    }

    @Test
    void getAllArticlesList_whenHasArticles_returnsAll() {
        // Arrange
        NewsArticle article1 = createMockArticle();
        NewsArticle article2 = createMockArticle();
        when(newsArticleRepository.findAll()).thenReturn(Arrays.asList(article1, article2));

        // Act
        List<FilteredArticleDto> result = newsService.getAllArticlesList();

        // Assert
        assertEquals(2, result.size());
        verify(newsArticleRepository).findAll();
    }

    @Test
    void getArticlesByTopicAndCountry_whenValid_returnsExpectedList() {
        // Arrange
        NewsTopic topic = NewsTopic.BUSINESS;
        NewsCountry country = NewsCountry.US;
        NewsArticle article = createMockArticle();
        article.setTopic(topic);
        article.setCountry(country);
        when(newsArticleRepository.findByTopicAndCountry(topic, country)).thenReturn(Arrays.asList(article));

        // Act
        List<FilteredArticleDto> result = newsService.getArticlesByTopicAndCountry(topic, country);

        // Assert
        assertEquals(1, result.size());
        verify(newsArticleRepository).findByTopicAndCountry(topic, country);
    }
}
