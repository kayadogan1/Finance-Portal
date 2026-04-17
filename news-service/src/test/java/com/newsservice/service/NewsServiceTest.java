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
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;
import org.springframework.test.util.ReflectionTestUtils;
import io.micrometer.tracing.TraceContext;

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

    @Mock
    private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(newsService, "API_URL", "http://newsapi.org");
        ReflectionTestUtils.setField(newsService, "API_KEY", "test-key");
        
        // Setup tracing mocks
        Span span = mock(Span.class);
        when(tracer.nextSpan()).thenReturn(span);
        when(span.name(anyString())).thenReturn(span);
        when(span.start()).thenReturn(span);
        when(tracer.withSpan(any())).thenReturn(mock(Tracer.SpanInScope.class));
        
        io.micrometer.tracing.CurrentTraceContext currentTraceContext = mock(io.micrometer.tracing.CurrentTraceContext.class);
        when(tracer.currentTraceContext()).thenReturn(currentTraceContext);
        when(currentTraceContext.wrap(any(Runnable.class))).thenAnswer(inv -> inv.getArgument(0));
        when(currentTraceContext.wrap(any(java.util.concurrent.Callable.class))).thenAnswer(inv -> inv.getArgument(0));
    }

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

    @Test
    void getAllArticles_whenApiReturnsData_savesNewArticles() {
        // Arrange
        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString(), any(java.util.function.Function.class))).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.accept(any())).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.onStatus(any(), any())).thenReturn(responseSpec);
        
        ArticleDto articleDto = new ArticleDto(
            null, "Author", "Title", "Desc", "Content", "https://news.com", "img", "2024-04-17T12:00:00Z"
        );
        NewsResponseDto response = new NewsResponseDto("ok", 1, List.of(articleDto));
        when(responseSpec.body(NewsResponseDto.class)).thenReturn(response);
        when(newsArticleRepository.existsByUrl(anyString())).thenReturn(false);

        // Act
        newsService.getAllArticles();

        // Assert
        verify(newsArticleRepository, atLeastOnce()).save(any(NewsArticle.class));
    }

    @Test
    void fetchArticlesFromAPI_whenApiFails_returnsEmptyList() {
        // Arrange
        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString(), any(java.util.function.Function.class))).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.accept(any())).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.onStatus(any(), any())).thenReturn(responseSpec);
        when(responseSpec.body(NewsResponseDto.class)).thenThrow(new RuntimeException("API Down"));

        // Act
        // Access private method via reflection or just call a public method that uses it
        // newsService.getAllArticles() calls it internally.
        newsService.getAllArticles();

        // Assert
        verify(newsArticleRepository, never()).save(any());
    }
}
