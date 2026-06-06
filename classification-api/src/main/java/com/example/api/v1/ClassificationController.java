package com.example.api.v1;

import com.example.api.v1.dto.ClassificationRequest;
import com.example.api.v1.dto.ClassificationResponse;
import com.example.api.v1.dto.HealthResponse;
import com.example.service.NewsClassificationService;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for classification operations.
 */
@RestController
@RequestMapping("/api/v1/news")
public class ClassificationController {

    private static final Logger logger = LogManager.getLogger(ClassificationController.class);

    private final NewsClassificationService newsClassificationService;

    /**
     * Creates a new ClassificationController with its required dependencies.
     *
     * @param newsClassificationService news classification service value
     */
    public ClassificationController(NewsClassificationService newsClassificationService) {
        this.newsClassificationService = newsClassificationService;
    }

    /**
     * Handles read requests for health.
     *
     * @return health result
     */
    @GetMapping("/health")
    public HealthResponse health() {
        logger.debug("Health check requested for classification-api");
        return new HealthResponse("ok", "classification-api");
    }

    /**
     * Handles create or command requests for classify.
     *
     * @param request request payload supplied by the client
     * @return classify result
     * @throws Exception when the operation cannot be completed
     */
    @PostMapping("/classify")
    @ResponseStatus(HttpStatus.OK)
    public ClassificationResponse classify(@RequestBody ClassificationRequest request) throws Exception {
        if (request == null || request.headline() == null || request.headline().isBlank()) {
            logger.warn("Classification request rejected because headline is blank");
            throw new IllegalArgumentException("headline bos olamaz");
        }
        logger.info("Classification request received. mode=standard, headlineLength={}", request.headline().trim().length());
        return newsClassificationService.classify(request.headline().trim());
    }

    /**
     * Handles create or command requests for classify text.
     *
     * @param text text value
     * @return classify text result
     * @throws Exception when the operation cannot be completed
     */
    @PostMapping(value = "/classify-text", consumes = MediaType.TEXT_PLAIN_VALUE)
    @ResponseStatus(HttpStatus.OK)
    public ClassificationResponse classifyText(@RequestBody String text) throws Exception {
        if (text == null || text.isBlank()) {
            logger.warn("Classification text request rejected because headline is blank");
            throw new IllegalArgumentException("headline bos olamaz");
        }
        logger.info("Classification text request received. mode=standard, headlineLength={}", text.trim().length());
        return newsClassificationService.classify(text.trim());
    }

    /**
     * Handles create or command requests for classify safe.
     *
     * @param request request payload supplied by the client
     * @return classify safe result
     * @throws Exception when the operation cannot be completed
     */
    @PostMapping("/classify-safe")
    @ResponseStatus(HttpStatus.OK)
    public ClassificationResponse classifySafe(@RequestBody ClassificationRequest request) throws Exception {
        if (request == null || request.headline() == null || request.headline().isBlank()) {
            logger.warn("Classification request rejected because headline is blank. mode=conservative");
            throw new IllegalArgumentException("headline bos olamaz");
        }
        logger.info("Classification request received. mode=conservative, headlineLength={}", request.headline().trim().length());
        return newsClassificationService.classifyConservative(request.headline().trim());
    }

    /**
     * Handles create or command requests for classify safe text.
     *
     * @param text text value
     * @return classify safe text result
     * @throws Exception when the operation cannot be completed
     */
    @PostMapping(value = "/classify-safe-text", consumes = MediaType.TEXT_PLAIN_VALUE)
    @ResponseStatus(HttpStatus.OK)
    public ClassificationResponse classifySafeText(@RequestBody String text) throws Exception {
        if (text == null || text.isBlank()) {
            logger.warn("Classification text request rejected because headline is blank. mode=conservative");
            throw new IllegalArgumentException("headline bos olamaz");
        }
        logger.info("Classification text request received. mode=conservative, headlineLength={}", text.trim().length());
        return newsClassificationService.classifyConservative(text.trim());
    }
}
