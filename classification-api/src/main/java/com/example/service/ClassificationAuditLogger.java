package com.example.service;

import com.example.api.v1.dto.ClassificationResponse;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;

/**
 * Class that provides classification audit logger behavior.
 */
@Component
public class ClassificationAuditLogger {

    private static final String HEADER = "createdAt,headline,assetType,symbol,assetScore,symbolScore,lexiconSymbol,topCandidates,unknown,modelVersion";
    private static final Logger logger = LogManager.getLogger(ClassificationAuditLogger.class);

    private final Path auditPath;
    private final Object lock = new Object();

    /**
     * Creates a new ClassificationAuditLogger with its required dependencies.
     *
     * @param auditPath audit path value
     */
    public ClassificationAuditLogger(
            @Value("${classification.audit.path:output/classification_audit.csv}") String auditPath) {
        this.auditPath = Path.of(auditPath);
    }

    /**
     * Performs log.
     *
     * @param response response payload returned by the downstream service
     */
    public void log(ClassificationResponse response) {
        if (response == null) {
            return;
        }

        try {
            /**
             * Performs synchronized.
             *
             * @param lock lock value
             */
            synchronized (lock) {
                ensureFileExists();
                Files.writeString(
                        auditPath,
                        toCsvLine(response) + System.lineSeparator(),
                        StandardCharsets.UTF_8,
                        StandardOpenOption.APPEND);
            }
        } catch (IOException e) {
            logger.error("Classification audit log write failed. path={}", auditPath, e);
        }
    }

    /**
     * Performs ensure file exists.
     *
     * @throws IOException when the operation cannot be completed
     */
    private void ensureFileExists() throws IOException {
        Path parent = auditPath.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        if (!Files.exists(auditPath)) {
            logger.info("Creating classification audit file. path={}", auditPath);
            Files.writeString(
                    auditPath,
                    HEADER + System.lineSeparator(),
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE_NEW);
        }
    }

    /**
     * Converts data to csv line.
     *
     * @param response response payload returned by the downstream service
     * @return to csv line result
     */
    private String toCsvLine(ClassificationResponse response) {
        return String.join(",",
                escape(Instant.now().toString()),
                escape(response.headline()),
                escape(response.assetType()),
                escape(response.symbol()),
                escape(response.assetScore()),
                escape(response.symbolScore()),
                escape(response.lexiconSymbol()),
                escape(String.join("|", response.topCandidates())),
                Boolean.toString(response.unknown()),
                escape(response.modelVersion()));
    }

    /**
     * Returns the result of escape.
     *
     * @param value value value
     * @return escape result
     */
    static String escape(String value) {
        String safeValue = value == null ? "" : value;
        String escaped = safeValue.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }
}
