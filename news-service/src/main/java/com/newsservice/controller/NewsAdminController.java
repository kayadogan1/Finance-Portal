package com.newsservice.controller;

import com.newsservice.dto.FilteredArticleDto;
import com.newsservice.dto.NewsApprovalRequest;
import com.newsservice.handling.ApiResult;
import com.newsservice.service.NewsRssService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/news/admin")
@RequiredArgsConstructor
public class NewsAdminController {

    private final NewsRssService newsRssService;

    @GetMapping("/pending")
    public ResponseEntity<ApiResult<List<FilteredArticleDto>>> getPendingArticles() {
        return ResponseEntity.ok(ApiResult.success(
                newsRssService.getPendingArticles(),
                "pending news articles fetched",
                200
        ));
    }

    @PatchMapping("/articles/{id}/approval")
    public ResponseEntity<ApiResult<FilteredArticleDto>> updateApproval(
            @PathVariable UUID id,
            @RequestBody NewsApprovalRequest request
    ) {
        boolean approved = request != null && Boolean.TRUE.equals(request.approved());
        return ResponseEntity.ok(ApiResult.success(
                newsRssService.updateApproval(id, approved),
                approved ? "news article approved" : "news article unapproved",
                200
        ));
    }

    @DeleteMapping("/articles/{id}")
    public ResponseEntity<ApiResult<Void>> deleteArticle(@PathVariable UUID id) {
        newsRssService.deleteArticle(id);
        return ResponseEntity.ok(ApiResult.success("news article deleted", 200));
    }

}
