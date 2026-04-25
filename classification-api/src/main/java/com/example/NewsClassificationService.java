package com.example;

import org.springframework.stereotype.Service;

@Service
public class NewsClassificationService {

    private final ClassificationAuditLogger auditLogger;

    public NewsClassificationService(ClassificationAuditLogger auditLogger) {
        this.auditLogger = auditLogger;
    }

    public ClassificationResponse classify(String headline) throws Exception {
        String normalizedText = NewsTextNormalizer.normalize(headline);
        HierarchicalPredictor.Prediction prediction = HierarchicalPredictor.predict(normalizedText);
        ClassificationResponse response = toResponse(prediction);
        auditLogger.log(response);
        return response;
    }

    public ClassificationResponse classifyConservative(String headline) throws Exception {
        String normalizedText = NewsTextNormalizer.normalize(headline);
        HierarchicalPredictor.Prediction prediction = HierarchicalPredictor.predictConservative(normalizedText);
        ClassificationResponse response = toResponse(prediction);
        auditLogger.log(response);
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
