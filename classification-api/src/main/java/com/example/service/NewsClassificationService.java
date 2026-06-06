package com.example.service;

import com.example.api.v1.dto.ClassificationResponse;
import com.example.model.HierarchicalPredictor;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

/**
 * Service component that handles news classification operations.
 */
@Service
public class NewsClassificationService {

    private static final Logger logger = LogManager.getLogger(NewsClassificationService.class);
    private final ClassificationAuditLogger auditLogger;

    /**
     * Creates a new NewsClassificationService with its required dependencies.
     *
     * @param auditLogger audit logger value
     */
    public NewsClassificationService(ClassificationAuditLogger auditLogger) {
        this.auditLogger = auditLogger;
    }

    /**
     * Returns the result of classify.
     *
     * @param headline headline value
     * @return classify result
     * @throws Exception when the operation cannot be completed
     */
    public ClassificationResponse classify(String headline) throws Exception {
        long startedAt = System.currentTimeMillis();
        String normalizedText = NewsTextNormalizer.normalize(headline);
        HierarchicalPredictor.Prediction prediction = HierarchicalPredictor.predict(normalizedText);
        ClassificationResponse response = toResponse(prediction);
        auditLogger.log(response);
        logger.info(
                "Classification completed. mode=standard, assetType={}, symbol={}, unknown={}, durationMs={}",
                response.assetType(),
                response.symbol(),
                response.unknown(),
                System.currentTimeMillis() - startedAt
        );
        return response;
    }

    /**
     * Returns the result of classify conservative.
     *
     * @param headline headline value
     * @return classify conservative result
     * @throws Exception when the operation cannot be completed
     */
    public ClassificationResponse classifyConservative(String headline) throws Exception {
        long startedAt = System.currentTimeMillis();
        String normalizedText = NewsTextNormalizer.normalize(headline);
        HierarchicalPredictor.Prediction prediction = HierarchicalPredictor.predictConservative(normalizedText);
        ClassificationResponse response = toResponse(prediction);
        auditLogger.log(response);
        logger.info(
                "Classification completed. mode=conservative, assetType={}, symbol={}, unknown={}, durationMs={}",
                response.assetType(),
                response.symbol(),
                response.unknown(),
                System.currentTimeMillis() - startedAt
        );
        return response;
    }

    /**
     * Converts data to response.
     *
     * @param prediction prediction value
     * @return to response result
     */
    private ClassificationResponse toResponse(HierarchicalPredictor.Prediction prediction) {
        return new ClassificationResponse(
                prediction.text(),
                prediction.assetType(),
                prediction.symbol(),
                prediction.assetScore(),
                prediction.symbolScore(),
                prediction.lexiconSymbol(),
                prediction.topCandidates(),
                "UNKNOWN".equals(prediction.symbol()),
                "release-20260422-194423");
    }
}
