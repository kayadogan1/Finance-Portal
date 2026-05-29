package com.newsservice.controller;

import com.newsservice.dto.FilteredArticleDto;
import com.newsservice.dto.NewsApprovalRequest;
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
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class NewsAdminControllerTest {

    @Mock
    private NewsRssService newsRssService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new NewsAdminController(newsRssService)).build();
    }

    @Test
    void getPendingArticles_returnsPendingArticles() throws Exception {
        when(newsRssService.getPendingArticles()).thenReturn(List.of(sampleArticle(false)));

        mockMvc.perform(get("/api/news/admin/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].title").value("Pending news"))
                .andExpect(jsonPath("$.data[0].isApproved").value(false));

        verify(newsRssService).getPendingArticles();
    }

    @Test
    void updateApproval_whenApprovedTrue_approvesArticle() throws Exception {
        UUID id = UUID.randomUUID();
        when(newsRssService.updateApproval(id, true)).thenReturn(sampleArticle(true));

        mockMvc.perform(patch("/api/news/admin/articles/{id}/approval", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"approved": true}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isApproved").value(true));

        verify(newsRssService).updateApproval(id, true);
    }

    @Test
    void updateApproval_whenRequestIsEmpty_unapprovesArticle() throws Exception {
        UUID id = UUID.randomUUID();
        when(newsRssService.updateApproval(id, false)).thenReturn(sampleArticle(false));

        mockMvc.perform(patch("/api/news/admin/articles/{id}/approval", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isApproved").value(false));

        verify(newsRssService).updateApproval(id, false);
    }

    @Test
    void deleteArticle_delegatesToService() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(delete("/api/news/admin/articles/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("news article deleted"));

        verify(newsRssService).deleteArticle(id);
    }

    private FilteredArticleDto sampleArticle(boolean approved) {
        return new FilteredArticleDto(
                new Source(UUID.randomUUID().toString(), "Yahoo RSS"),
                "Author",
                "Pending news",
                "US",
                "STOCK",
                "Description",
                "Content",
                "https://example.com/news",
                "https://example.com/image.png",
                "2026-05-01T10:00",
                "classification-api",
                "AAPL",
                approved,
                List.of()
        );
    }
}
