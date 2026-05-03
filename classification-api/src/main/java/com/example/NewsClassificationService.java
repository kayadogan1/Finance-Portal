package com.example;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

@Service
public class NewsClassificationService {

    private static final Logger logger = LogManager.getLogger(NewsClassificationService.class);
    private final ClassificationAuditLogger auditLogger;

    public NewsClassificationService(ClassificationAuditLogger auditLogger) {
        this.auditLogger = auditLogger;
    }

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
