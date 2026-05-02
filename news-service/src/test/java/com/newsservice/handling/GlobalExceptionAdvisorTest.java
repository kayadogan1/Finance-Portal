package com.newsservice.handling;

import com.newsservice.controller.NewsController;
import com.newsservice.exceptions.AuthenticationException;
import com.newsservice.exceptions.BadRequestException;
import com.newsservice.exceptions.MethodNotAllowedException;
import com.newsservice.exceptions.NotFoundException;
import com.newsservice.service.NewsRssService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionAdvisorTest {

    private MockMvc mockMvc;
    private NewsRssService newsRssService;

    @BeforeEach
    void setUp() {
        newsRssService = Mockito.mock(NewsRssService.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new NewsController(newsRssService), new ThrowingController())
                .setControllerAdvice(new GlobalExceptionAdvisor())
                .build();
    }

    @Test
    void handlesNotFoundException() throws Exception {
        when(newsRssService.getAllArticlesAfterDate(any())).thenThrow(new NotFoundException("not found"));

        mockMvc.perform(get("/api/news").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("not found"))
                .andExpect(jsonPath("$.response").value(404));
    }

    @Test
    void handlesBadRequestException() throws Exception {
        mockMvc.perform(get("/errors/bad-request"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("bad request"))
                .andExpect(jsonPath("$.response").value(400));
    }

    @Test
    void handlesAuthenticationException() throws Exception {
        mockMvc.perform(get("/errors/auth"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("unauthorized"))
                .andExpect(jsonPath("$.response").value(401));
    }

    @Test
    void handlesMethodNotAllowedException() throws Exception {
        mockMvc.perform(get("/errors/method"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.message").value("not allowed"))
                .andExpect(jsonPath("$.response").value(403));
    }

    @Test
    void handlesGenericException() throws Exception {
        mockMvc.perform(get("/errors/general"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Beklenmeyen bir hata oluştu"))
                .andExpect(jsonPath("$.response").value(500));
    }

    @RestController
    static class ThrowingController {
        @GetMapping("/errors/bad-request")
        void badRequest() {
            throw new BadRequestException("bad request");
        }

        @GetMapping("/errors/auth")
        void auth() {
            throw new AuthenticationException("unauthorized");
        }

        @GetMapping("/errors/method")
        void method() {
            throw new MethodNotAllowedException("not allowed");
        }

        @GetMapping("/errors/general")
        void general() {
            throw new IllegalStateException("boom");
        }
    }
}
