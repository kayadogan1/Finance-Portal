package com.newsservice.controller;

import com.newsservice.dto.ProviderStatusResponseDto;
import com.newsservice.handling.ApiResult;
import com.newsservice.service.NewsAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/news/admin")
@RequiredArgsConstructor
public class NewsAdminController {

    private final NewsAdminService newsAdminService;

    @GetMapping("/providers/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResult<ProviderStatusResponseDto>> getProviderStatuses() {
        return ResponseEntity.ok(ApiResult.success(
                newsAdminService.getProviderStatuses(),
                "news provider statuses fetched",
                200
        ));
    }
}
