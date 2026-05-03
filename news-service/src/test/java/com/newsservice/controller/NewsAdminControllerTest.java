package com.newsservice.controller;

import com.newsservice.dto.ProviderStatusDto;
import com.newsservice.dto.ProviderStatusResponseDto;
import com.newsservice.service.NewsAdminService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class NewsAdminControllerTest {

    @Mock
    private NewsAdminService newsAdminService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new NewsAdminController(newsAdminService)).build();
    }

    @Test
    void getProviderStatuses_returnsAdminProviderPayload() throws Exception {
        when(newsAdminService.getProviderStatuses()).thenReturn(
                new ProviderStatusResponseDto(
                        "news-service",
                        List.of(new ProviderStatusDto("news-yahoo-rss", "Yahoo RSS", "ready", "Configured"))
                )
        );

        mockMvc.perform(get("/api/news/admin/providers/status").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.service").value("news-service"))
                .andExpect(jsonPath("$.data.providers[0].key").value("news-yahoo-rss"));

        verify(newsAdminService).getProviderStatuses();
    }
}
