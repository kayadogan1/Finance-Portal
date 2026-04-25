package com.example;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class InstrumentCatalog {

    static final String RESOURCE_DIR = "src/main/resources/data/";
    static final String INSTRUMENTS = RESOURCE_DIR + "instruments.csv";

    private InstrumentCatalog() {
    }

    static List<Instrument> loadInstruments(String path) throws IOException {
        List<Instrument> instruments = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(openResource(path), StandardCharsets.UTF_8))) {
            reader.readLine();
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = splitCsv(line, 6);
                if (parts.length < 6) {
                    continue;
                }

                List<String> aliases = Arrays.stream(parts[4].replace("\"", "").split("\\|"))
                        .map(String::trim)
                        .filter(alias -> !alias.isBlank())
                        .toList();

                instruments.add(new Instrument(
                        parts[0].trim(),
                        parts[1].trim(),
                        parts[2].trim(),
                        parts[3].trim(),
                        aliases,
                        parts[5].trim()));
            }
        }
        return instruments;
    }

    static InputStream openResource(String path) throws IOException {
        File file = new File(path);
        if (file.exists()) {
            return new FileInputStream(file);
        }

        String resourcePath = path.startsWith("src/main/resources/")
                ? path.substring("src/main/resources/".length())
                : path;

        InputStream resource = InstrumentCatalog.class.getClassLoader().getResourceAsStream(resourcePath);
        if (resource != null) {
            return resource;
        }

        throw new FileNotFoundException("Resource not found: " + path);
    }

    static String[] splitCsv(String line, int expectedParts) {
        List<String> parts = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if (ch == ',' && !inQuotes && parts.size() < expectedParts - 1) {
                parts.add(current.toString().trim());
                current.setLength(0);
                continue;
            }
            current.append(ch);
        }

        parts.add(current.toString().trim());
        return parts.toArray(String[]::new);
    }

    record Instrument(
            String symbol,
            String assetType,
            String exchange,
            String canonicalName,
            List<String> aliases,
            String sector) {
    }
}
