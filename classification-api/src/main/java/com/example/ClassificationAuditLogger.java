package com.example;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;

@Component
public class ClassificationAuditLogger {

    private static final String HEADER = "createdAt,headline,assetType,symbol,assetScore,symbolScore,lexiconSymbol,topCandidates,unknown,modelVersion";

    private final Path auditPath;
    private final Object lock = new Object();

    public ClassificationAuditLogger(
            @Value("${classification.audit.path:output/classification_audit.csv}") String auditPath) {
        this.auditPath = Path.of(auditPath);
    }

    public void log(ClassificationResponse response) {
        if (response == null) {
            return;
        }

        try {
            synchronized (lock) {
                ensureFileExists();
                Files.writeString(
                        auditPath,
                        toCsvLine(response) + System.lineSeparator(),
                        StandardCharsets.UTF_8,
                        StandardOpenOption.APPEND);
            }
        } catch (IOException e) {
            System.err.println("Classification audit log write failed: " + e.getMessage());
        }
    }

    private void ensureFileExists() throws IOException {
        Path parent = auditPath.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        if (!Files.exists(auditPath)) {
            Files.writeString(
                    auditPath,
                    HEADER + System.lineSeparator(),
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE_NEW);
        }
    }

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

    static String escape(String value) {
        String safeValue = value == null ? "" : value;
        String escaped = safeValue.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }
}
