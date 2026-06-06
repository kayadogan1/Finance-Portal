package com.example.service;

/**
 * Class that provides news text normalizer behavior.
 */
public final class NewsTextNormalizer {

    /**
     * Creates a new NewsTextNormalizer with its required dependencies.
     */
    private NewsTextNormalizer() {
    }

    /**
     * Returns the result of normalize.
     *
     * @param text text value
     * @return normalize result
     */
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

    /**
     * Returns the result of combine.
     *
     * @param title title value
     * @param description description value
     * @return combine result
     */
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
