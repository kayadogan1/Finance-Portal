package com.newsservice.controller;

import com.newsservice.dto.FilteredArticleDto;
import com.newsservice.dto.NewsCountry;
import com.newsservice.dto.NewsTopic;
import com.newsservice.dto.Source;
import com.newsservice.service.NewsRssService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class NewsControllerTest {

    @Mock
    private NewsRssService newsRssService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new NewsController(newsRssService)).build();
    }

    @Test
    void getNews_withoutFilters_returnsAllArticles() throws Exception {
        when(newsRssService.getAllArticlesAfterDate(any()))
                .thenReturn(List.of(sampleArticle("All news")));

        mockMvc.perform(get("/api/news").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].title").value("All news"));

        verify(newsRssService).getAllArticlesAfterDate(any());
    }

    @Test
    void getNews_withTopicAndCountry_usesCombinedFilter() throws Exception {
        when(newsRssService.getArticlesByTopicAndCountryAfterDate(any(), any(), any()))
                .thenReturn(List.of(sampleArticle("Filtered news")));

        mockMvc.perform(get("/api/news")
                        .param("topic", "STOCK")
                        .param("country", "US"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("Filtered news"));

        verify(newsRssService).getArticlesByTopicAndCountryAfterDate(eq(NewsTopic.STOCK), eq(NewsCountry.US), any());
    }

    @Test
    void getNews_withTopicOnly_usesTopicFilter() throws Exception {
        when(newsRssService.getArticlesByTopicAfterDate(any(), any()))
                .thenReturn(List.of(sampleArticle("Topic only")));

        mockMvc.perform(get("/api/news").param("topic", "CRYPTO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("Topic only"));

        verify(newsRssService).getArticlesByTopicAfterDate(eq(NewsTopic.CRYPTO), any());
    }

    @Test
    void getNews_withCountryOnly_usesCountryFilter() throws Exception {
        when(newsRssService.getArticlesByCountryAfterDate(any(), any()))
                .thenReturn(List.of(sampleArticle("Country only")));

        mockMvc.perform(get("/api/news").param("country", "TR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("Country only"));

        verify(newsRssService).getArticlesByCountryAfterDate(eq(NewsCountry.TR), any());
    }

    @Test
    void refreshNews_returnsSuccessPayload() throws Exception {
        mockMvc.perform(post("/api/news/refresh"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("all news updating from provider"))
                .andExpect(jsonPath("$.success").value(false));

        verify(newsRssService).refresh();
    }

    @Test
    void getTopics_returnsAllEnumValues() throws Exception {
        mockMvc.perform(get("/api/news/topics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(7))
                .andExpect(jsonPath("$.data[0]").value("GENERAL"))
                .andExpect(jsonPath("$.data[6]").value("FUND"));
    }

    private FilteredArticleDto sampleArticle(String title) {
        return new FilteredArticleDto(
                new Source("1", "Yahoo RSS"),
                "Author",
                title,
                "US",
                "STOCK",
                "Description",
                "Content",
                "https://example.com/article",
                "https://example.com/image.png",
                "2026-05-01T10:00",
                "classification-api",
                "AAPL",
                List.of()
        );
    }
}
