package com.example.service;

public final class NewsTextNormalizer {

    private NewsTextNormalizer() {
    }

    public static String normalize(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }

        return text
                .replaceAll("<[^>]*>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replaceAll("\\s+", " ")
                .trim();
    }

    public static String combine(String title, String description) {
        String cleanTitle = normalize(title);
        String cleanDescription = normalize(description);

        if (cleanTitle.isBlank()) {
            return cleanDescription;
        }
        if (cleanDescription.isBlank()) {
            return cleanTitle;
        }
        if (cleanDescription.equalsIgnoreCase(cleanTitle)) {
            return cleanTitle;
        }

        return cleanTitle + " " + cleanDescription;
    }
}
