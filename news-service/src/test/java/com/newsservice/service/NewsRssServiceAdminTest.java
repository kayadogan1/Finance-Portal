package com.newsservice.service;

import com.newsservice.dto.FilteredArticleDto;
import com.newsservice.dto.NewsCountry;
import com.newsservice.dto.NewsTopic;
import com.newsservice.exceptions.NotFoundException;
import com.newsservice.model.NewsArticle;
import com.newsservice.model.NewsArticleInstrument;
import com.newsservice.repository.NewsArticleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NewsRssServiceAdminTest {

    @Mock
    private NewsArticleRepository newsArticleRepository;

    private NewsRssService newsRssService;

    @BeforeEach
    void setUp() {
        newsRssService = new NewsRssService(RestClient.create(), newsArticleRepository);
    }

    @Test
    void getPendingArticles_mapsPendingArticlesAndSortsInstrumentsByRank() {
        NewsArticle article = sampleArticle(false);
        article.setInstruments(new ArrayList<>(List.of(
                instrument(article, "MSFT", 2, false),
                instrument(article, "AAPL", 1, true)
        )));
        when(newsArticleRepository.findByIsApprovedFalseOrderByPublishedDateDesc()).thenReturn(List.of(article));

        List<FilteredArticleDto> result = newsRssService.getPendingArticles();

        assertEquals(1, result.size());
        assertFalse(result.getFirst().isApproved());
        assertEquals("AAPL", result.getFirst().instruments().getFirst().symbol());
        assertEquals("MSFT", result.getFirst().instruments().get(1).symbol());
        verify(newsArticleRepository).findByIsApprovedFalseOrderByPublishedDateDesc();
    }

    @Test
    void updateApproval_whenArticleExists_updatesAndReturnsDto() {
        UUID id = UUID.randomUUID();
        NewsArticle article = sampleArticle(false);
        article.setId(id);
        when(newsArticleRepository.findById(id)).thenReturn(Optional.of(article));
        when(newsArticleRepository.save(any(NewsArticle.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FilteredArticleDto result = newsRssService.updateApproval(id, true);

        assertTrue(article.isApproved());
        assertTrue(result.isApproved());
        verify(newsArticleRepository).save(article);
    }

    @Test
    void updateApproval_whenArticleMissing_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(newsArticleRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> newsRssService.updateApproval(id, true));
    }

    @Test
    void deleteArticle_whenArticleExists_deletesById() {
        UUID id = UUID.randomUUID();
        when(newsArticleRepository.existsById(id)).thenReturn(true);

        newsRssService.deleteArticle(id);

        verify(newsArticleRepository).deleteById(id);
    }

    @Test
    void deleteArticle_whenArticleMissing_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(newsArticleRepository.existsById(id)).thenReturn(false);

        assertThrows(NotFoundException.class, () -> newsRssService.deleteArticle(id));
    }

    private NewsArticle sampleArticle(boolean approved) {
        return NewsArticle.builder()
                .id(UUID.randomUUID())
                .sourceName("Yahoo RSS")
                .authorName("Author")
                .title("Pending news")
                .country(NewsCountry.US)
                .topic(NewsTopic.STOCK)
                .description("Description")
                .content("Content")
                .url("https://example.com/news")
                .urlToImage("https://example.com/image.png")
                .publishedDate(LocalDateTime.of(2026, 5, 1, 10, 0))
                .modelName("classification-api")
                .instrumentSymbol("AAPL")
                .isApproved(approved)
                .build();
    }

    private NewsArticleInstrument instrument(NewsArticle article, String symbol, int rankOrder, boolean primary) {
        return NewsArticleInstrument.builder()
                .newsArticle(article)
                .symbol(symbol)
                .assetType("STOCK")
                .score(primary ? "0.99" : "0.80")
                .rankOrder(rankOrder)
                .primaryMatch(primary)
                .matchSource(primary ? "MODEL" : "CANDIDATE")
                .build();
    }
}
