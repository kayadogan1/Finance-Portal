package com.example;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/news")
public class ClassificationController {

    private final NewsClassificationService newsClassificationService;

    public ClassificationController(NewsClassificationService newsClassificationService) {
        this.newsClassificationService = newsClassificationService;
    }

    @GetMapping("/health")
    public HealthResponse health() {
        return new HealthResponse("ok", "classification-api");
    }

    @PostMapping("/classify")
    @ResponseStatus(HttpStatus.OK)
    public ClassificationResponse classify(@RequestBody ClassificationRequest request) throws Exception {
        if (request == null || request.headline() == null || request.headline().isBlank()) {
            throw new IllegalArgumentException("headline bos olamaz");
        }
        return newsClassificationService.classify(request.headline().trim());
    }

    @PostMapping(value = "/classify-text", consumes = MediaType.TEXT_PLAIN_VALUE)
    @ResponseStatus(HttpStatus.OK)
    public ClassificationResponse classifyText(@RequestBody String text) throws Exception {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("headline bos olamaz");
        }
        return newsClassificationService.classify(text.trim());
    }

    @PostMapping("/classify-safe")
    @ResponseStatus(HttpStatus.OK)
    public ClassificationResponse classifySafe(@RequestBody ClassificationRequest request) throws Exception {
        if (request == null || request.headline() == null || request.headline().isBlank()) {
            throw new IllegalArgumentException("headline bos olamaz");
        }
        return newsClassificationService.classifyConservative(request.headline().trim());
    }

    @PostMapping(value = "/classify-safe-text", consumes = MediaType.TEXT_PLAIN_VALUE)
    @ResponseStatus(HttpStatus.OK)
    public ClassificationResponse classifySafeText(@RequestBody String text) throws Exception {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("headline bos olamaz");
        }
        return newsClassificationService.classifyConservative(text.trim());
    }
}
