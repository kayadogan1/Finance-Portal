package com.example;

import opennlp.tools.doccat.DoccatModel;
import opennlp.tools.doccat.DocumentCategorizerME;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

public class HierarchicalPredictor {

    private static final String MODEL_DIR = "src/main/resources/models/";
    private static final String EXTERNAL_MODEL_DIR_PROP = "classification.model.dir";
    private static final double TYPED_FOCUSED_WEIGHT = 0.42;
    private static final double TYPED_WEIGHT = 0.33;
    private static final double GLOBAL_FOCUSED_WEIGHT = 0.15;
    private static final double GLOBAL_WEIGHT = 0.10;
    private static final double SYMBOL_ACCEPT_THRESHOLD = 0.18;
    private static final double SYMBOL_GAP_THRESHOLD = 0.05;
    private static final int EARLY_CONTEXT_CHAR_LIMIT = 140;
    private static final String UNKNOWN_SYMBOL = "UNKNOWN";
    private static final ConcurrentMap<String, DoccatModel> MODEL_CACHE = new ConcurrentHashMap<>();
    private static final ConcurrentMap<String, List<InstrumentCatalog.Instrument>> INSTRUMENT_CACHE = new ConcurrentHashMap<>();
    private static final ConcurrentMap<String, Set<String>> ALLOWED_SYMBOLS_CACHE = new ConcurrentHashMap<>();

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            throw new IllegalArgumentException("Bir haber metni ver. Ornek: \"THY yeni ucak siparisi verdi\"");
        }

        Prediction prediction = predict(String.join(" ", args));
        System.out.println("Metin     : " + prediction.text());
        System.out.println("1. adim   : " + prediction.assetType() + " (" + prediction.assetScore() + ")");
        System.out.println("2. adim   : " + prediction.symbol() + " (" + prediction.symbolScore() + ")");
        System.out.println("Top 3 sembol tahmini:");

        if (prediction.lexiconSymbol() != null) {
            System.out.println("   - " + prediction.lexiconSymbol() + " (lexicon)");
        }

        for (String candidate : prediction.topCandidates()) {
            System.out.println("   - " + candidate);
        }
    }

    static Prediction predict(String text) throws Exception {
        return predictInternal(text, false);
    }

    static Prediction predictConservative(String text) throws Exception {
        return predictInternal(text, true);
    }

    static Prediction predictInternal(String text, boolean conservative) throws Exception {
        List<InstrumentCatalog.Instrument> instruments = loadInstruments(InstrumentCatalog.INSTRUMENTS);
        List<LexiconMatcher.MatchedInstrument> lexiconMatches =
                LexiconMatcher.matchHeadline(text, instruments);

        DocumentCategorizerME level1 = load("tr-doccat-level1.bin");

        double[] typeScores = level1.categorize(tokenize(text));
        String assetType = level1.getBestCategory(typeScores);
        String symbolFromLexicon = null;
        boolean ambiguousLexiconMatch = false;

        if (!lexiconMatches.isEmpty()) {
            LexiconMatcher.MatchedInstrument bestLexiconMatch = bestContextualLexiconMatch(text, lexiconMatches);
            if (isHighConfidenceLexiconMatch(bestLexiconMatch, lexiconMatches)
                    || contextualLexiconScore(text, bestLexiconMatch) >= 0.65) {
                assetType = bestLexiconMatch.instrument().assetType();
                if (conservative && hasAmbiguousCompetingLexiconMatch(bestLexiconMatch, lexiconMatches)) {
                    ambiguousLexiconMatch = true;
                } else {
                    symbolFromLexicon = bestLexiconMatch.instrument().symbol();
                }
            }
        }

        if ("CRYPTO".equals(assetType)
                && symbolFromLexicon == null
                && !LexiconMatcher.containsCryptoContext(text)) {
            assetType = "OTHER";
        }

        String[] tokens = tokenize(text);
        Level2Models models = loadLevel2Models(assetType);
        Map<String, Double> symbolScoreMap = combineScoreMaps(models, tokens);
        Set<String> allowedSymbols = allowedSymbols(assetType);
        final String lexiconSymbol = symbolFromLexicon;
        String symbol = ambiguousLexiconMatch
                ? UNKNOWN_SYMBOL
                : resolveSymbol(assetType, allowedSymbols, symbolScoreMap, lexiconSymbol);

        List<String> topCandidates = relatedLexiconCandidates(text, lexiconMatches, symbol);

        return new Prediction(
                text,
                assetType,
                symbol,
                topScore(typeScores),
                scoreOf(symbol, symbolScoreMap),
                lexiconSymbol,
                topCandidates);
    }

    static DocumentCategorizerME load(String modelName) throws IOException {
        return new DocumentCategorizerME(loadModel(modelName));
    }

    static Level2Models loadLevel2Models(String assetType) throws IOException {
        return new Level2Models(
                loadIfExists("tr-doccat-level2-" + assetType + "-focused.bin"),
                loadIfExists("tr-doccat-level2-" + assetType + ".bin"),
                loadIfExists("tr-doccat-level2-focused.bin"),
                load("tr-doccat-level2.bin"));
    }

    static DocumentCategorizerME loadIfExists(String modelName) throws IOException {
        if (!modelExists(modelName)) {
            return null;
        }
        return load(modelName);
    }

    static DoccatModel loadModel(String modelName) throws IOException {
        String cacheKey = modelCacheKey(modelName);
        DoccatModel cached = MODEL_CACHE.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        try (InputStream input = openModelStream(modelName)) {
            DoccatModel loaded = new DoccatModel(input);
            DoccatModel existing = MODEL_CACHE.putIfAbsent(cacheKey, loaded);
            return existing == null ? loaded : existing;
        }
    }

    static String modelCacheKey(String modelName) {
        String externalModelDir = System.getProperty(EXTERNAL_MODEL_DIR_PROP);
        String modelRoot = externalModelDir == null || externalModelDir.isBlank()
                ? "classpath-or-local"
                : new File(externalModelDir).getAbsolutePath();
        return modelRoot + "/" + modelName;
    }

    static boolean modelExists(String modelName) {
        String externalModelDir = System.getProperty(EXTERNAL_MODEL_DIR_PROP);
        if (externalModelDir != null && !externalModelDir.isBlank()) {
            return new File(externalModelDir, modelName).exists();
        }

        File localFile = new File(MODEL_DIR + modelName);
        if (localFile.exists()) {
            return true;
        }

        return HierarchicalPredictor.class.getClassLoader().getResource("models/" + modelName) != null;
    }

    static InputStream openModelStream(String modelName) throws IOException {
        String externalModelDir = System.getProperty(EXTERNAL_MODEL_DIR_PROP);
        if (externalModelDir != null && !externalModelDir.isBlank()) {
            File externalFile = new File(externalModelDir, modelName);
            if (externalFile.exists()) {
                return new FileInputStream(externalFile);
            }
        }

        File localFile = new File(MODEL_DIR + modelName);
        if (localFile.exists()) {
            return new FileInputStream(localFile);
        }

        InputStream resource = HierarchicalPredictor.class.getClassLoader()
                .getResourceAsStream("models/" + modelName);
        if (resource != null) {
            return resource;
        }

        throw new IOException("Model bulunamadi: " + modelName);
    }

    static Map<String, Double> combineScoreMaps(Level2Models models, String[] tokens) {
        Map<String, Double> combined = new LinkedHashMap<>();
        addWeightedScores(combined, models.typedFocused(), tokens, TYPED_FOCUSED_WEIGHT);
        addWeightedScores(combined, models.typed(), tokens, TYPED_WEIGHT);
        addWeightedScores(combined, models.globalFocused(), tokens, GLOBAL_FOCUSED_WEIGHT);
        addWeightedScores(combined, models.global(), tokens, GLOBAL_WEIGHT);
        return combined;
    }

    static void addWeightedScores(
            Map<String, Double> combined,
            DocumentCategorizerME model,
            String[] tokens,
            double weight) {

        if (model == null || weight <= 0.0) {
            return;
        }

        for (Map.Entry<String, Double> entry : model.scoreMap(tokens).entrySet()) {
            combined.merge(entry.getKey(), entry.getValue() * weight, Double::sum);
        }
    }

    static String[] tokenize(String text) {
        return Arrays.stream(text.split("\\s+"))
                .map(String::trim)
                .filter(token -> !token.isBlank())
                .toArray(String[]::new);
    }

    static String topScore(double[] probs) {
        double max = 0.0;
        for (double prob : probs) {
            max = Math.max(max, prob);
        }
        return String.format("%.4f", max);
    }

    static String bestSymbolForType(Set<String> allowedSymbols, Map<String, Double> scoreMap) {
        return scoreMap.entrySet().stream()
                .filter(entry -> allowedSymbols.contains(entry.getKey()))
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElseGet(() -> scoreMap.entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .map(Map.Entry::getKey)
                        .orElse("UNKNOWN"));
    }

    static String resolveSymbol(
            String assetType,
            Set<String> allowedSymbols,
            Map<String, Double> scoreMap,
            String lexiconSymbol) {

        if (lexiconSymbol != null) {
            return lexiconSymbol;
        }
        if ("OTHER".equals(assetType)) {
            return UNKNOWN_SYMBOL;
        }

        String bestSymbol = bestSymbolForType(allowedSymbols, scoreMap);
        double bestScore = scoreMap.getOrDefault(bestSymbol, 0.0);
        double runnerUpScore = scoreMap.entrySet().stream()
                .filter(entry -> allowedSymbols.contains(entry.getKey()))
                .filter(entry -> !entry.getKey().equals(bestSymbol))
                .map(Map.Entry::getValue)
                .max(Double::compareTo)
                .orElse(0.0);

        if (bestScore < SYMBOL_ACCEPT_THRESHOLD || bestScore - runnerUpScore < SYMBOL_GAP_THRESHOLD) {
            return UNKNOWN_SYMBOL;
        }
        return bestSymbol;
    }

    static String scoreOf(String symbol, Map<String, Double> scoreMap) {
        return String.format("%.4f", scoreMap.getOrDefault(symbol, 0.0));
    }

    static LexiconMatcher.MatchedInstrument bestContextualLexiconMatch(
            String text,
            List<LexiconMatcher.MatchedInstrument> matches) {

        return matches.stream()
                .max(Comparator.comparingDouble(match -> contextualLexiconScore(text, match)))
                .orElse(matches.getFirst());
    }

    static double contextualLexiconScore(String text, LexiconMatcher.MatchedInstrument match) {
        int position = normalizedIndexOf(text, match.alias().alias());
        double score = match.score();

        if (position == 0) {
            score += 0.45;
        } else if (position > 0 && position <= 60) {
            score += 0.35;
        } else if (position > 0 && position <= EARLY_CONTEXT_CHAR_LIMIT) {
            score += 0.20;
        }

        if ("symbol".equals(match.alias().kind())) {
            score += 0.12;
        }
        if ("canonical".equals(match.alias().kind())) {
            score += 0.08;
        }
        if ("STOCK".equals(match.instrument().assetType()) && hasStockContextNearAlias(text, match.alias().alias())) {
            score += 0.18;
        }
        if ("INDEX".equals(match.instrument().assetType()) && isBenchmarkComparisonContext(text, match.alias().alias())) {
            score -= 0.30;
        }

        return score;
    }

    static List<String> relatedLexiconCandidates(
            String text,
            List<LexiconMatcher.MatchedInstrument> matches,
            String selectedSymbol) {

        if (matches.isEmpty()) {
            return List.of();
        }

        Set<String> seen = new HashSet<>();
        List<LexiconMatcher.MatchedInstrument> rankedMatches = matches.stream()
                .filter(match -> !match.instrument().symbol().equals(selectedSymbol))
                .filter(match -> isHighConfidenceRelatedMatch(text, match))
                .sorted(Comparator.comparingDouble(
                        (LexiconMatcher.MatchedInstrument match) -> contextualLexiconScore(text, match))
                        .reversed())
                .toList();

        List<String> candidates = new ArrayList<>();
        for (LexiconMatcher.MatchedInstrument match : rankedMatches) {
            String symbol = match.instrument().symbol();
            if (!seen.add(symbol)) {
                continue;
            }
            candidates.add(symbol + " (" + String.format("%.4f", Math.min(1.0, contextualLexiconScore(text, match))) + ")");
            if (candidates.size() == 4) {
                break;
            }
        }
        return candidates;
    }

    static boolean isHighConfidenceRelatedMatch(String text, LexiconMatcher.MatchedInstrument match) {
        if (!isHighConfidenceLexiconMatch(match, List.of(match))) {
            return false;
        }
        if ("CRYPTO".equals(match.instrument().assetType())
                && match.alias().alias().equalsIgnoreCase(match.instrument().symbol())
                && LexiconMatcher.isAmbiguousCryptoSymbol(match.instrument().symbol())
                && !LexiconMatcher.containsCryptoContext(text)) {
            return false;
        }
        return contextualLexiconScore(text, match) >= 0.50;
    }

    static int normalizedIndexOf(String text, String alias) {
        String normalizedText = LexiconMatcher.normalize(text == null ? "" : text);
        String normalizedAlias = LexiconMatcher.normalize(alias == null ? "" : alias);
        return normalizedText.indexOf(normalizedAlias);
    }

    static boolean hasStockContextNearAlias(String text, String alias) {
        String normalizedText = LexiconMatcher.normalize(text == null ? "" : text);
        String normalizedAlias = LexiconMatcher.normalize(alias == null ? "" : alias);
        int position = normalizedText.indexOf(normalizedAlias);
        if (position < 0) {
            return false;
        }
        int from = Math.max(0, position - 30);
        int to = Math.min(normalizedText.length(), position + normalizedAlias.length() + 45);
        String window = normalizedText.substring(from, to);
        return window.contains("stock")
                || window.contains("hisse")
                || window.contains("earnings")
                || window.contains("bilan")
                || window.contains("ceo")
                || window.contains("dividend")
                || window.contains("temettu");
    }

    static boolean isBenchmarkComparisonContext(String text, String alias) {
        String normalizedText = LexiconMatcher.normalize(text == null ? "" : text);
        String normalizedAlias = LexiconMatcher.normalize(alias == null ? "" : alias);
        int position = normalizedText.indexOf(normalizedAlias);
        if (position < 0) {
            return false;
        }
        int from = Math.max(0, position - 45);
        int to = Math.min(normalizedText.length(), position + normalizedAlias.length() + 45);
        String window = normalizedText.substring(from, to);
        return window.contains("compared with")
                || window.contains("compared to")
                || window.contains("versus")
                || window.contains("vs")
                || window.contains("kiyasla");
    }

    static boolean looksLikeTickerAlias(String alias) {
        return alias.equals(alias.toUpperCase()) && alias.length() >= 3 && alias.length() <= 5;
    }

    static boolean isHighConfidenceLexiconMatch(
            LexiconMatcher.MatchedInstrument bestMatch,
            List<LexiconMatcher.MatchedInstrument> allMatches) {

        String alias = bestMatch.alias().alias();
        String kind = bestMatch.alias().kind();
        double runnerUpScore = allMatches.size() > 1 ? allMatches.get(1).score() : 0.0;
        double scoreGap = bestMatch.score() - runnerUpScore;

        if ("symbol".equals(kind) || "canonical".equals(kind)) {
            if ("BIST".equals(bestMatch.instrument().exchange())) {
                return true;
            }
            return true;
        }
        if (alias.contains("/") || alias.contains(" ")) {
            return bestMatch.score() >= 0.45;
        }
        if ("BIST".equals(bestMatch.instrument().exchange())
                && looksLikeTickerAlias(alias)
                && scoreGap >= 0.05) {
            return true;
        }
        if (!looksLikeTickerAlias(alias)
                && alias.length() >= 5
                && scoreGap >= 0.10
                && bestMatch.score() >= 0.40) {
            return true;
        }
        if ("BIST".equals(bestMatch.instrument().exchange()) && alias.length() >= 5) {
            return scoreGap >= 0.05;
        }
        return bestMatch.score() >= 0.70 && scoreGap >= 0.10 && !looksLikeTickerAlias(alias);
    }

    static boolean hasAmbiguousCompetingLexiconMatch(
            LexiconMatcher.MatchedInstrument bestMatch,
            List<LexiconMatcher.MatchedInstrument> allMatches) {

        for (int i = 1; i < allMatches.size(); i++) {
            LexiconMatcher.MatchedInstrument competitor = allMatches.get(i);
            if (bestMatch.instrument().symbol().equals(competitor.instrument().symbol())) {
                continue;
            }
            if (!isStrongCompetingEntityMatch(competitor)) {
                continue;
            }
            return true;
        }
        return false;
    }

    static boolean isStrongCompetingEntityMatch(LexiconMatcher.MatchedInstrument match) {
        String alias = match.alias().alias();
        String kind = match.alias().kind();

        if ("symbol".equals(kind) || "canonical".equals(kind)) {
            return true;
        }
        if (alias.contains("/") || alias.contains(" ")) {
            return match.score() >= 0.45;
        }
        if (!looksLikeTickerAlias(alias) && alias.length() >= 5) {
            return match.score() >= 0.40;
        }
        return false;
    }

    static Set<String> allowedSymbols(String assetType) throws Exception {
        Set<String> cached = ALLOWED_SYMBOLS_CACHE.get(assetType);
        if (cached != null) {
            return cached;
        }

        Set<String> symbols = new HashSet<>();
        for (InstrumentCatalog.Instrument instrument : loadInstruments(InstrumentCatalog.INSTRUMENTS)) {
            if (assetType.equals(instrument.assetType())) {
                symbols.add(instrument.symbol());
            }
        }
        Set<String> existing = ALLOWED_SYMBOLS_CACHE.putIfAbsent(assetType, Set.copyOf(symbols));
        return existing == null ? Set.copyOf(symbols) : existing;
    }

    static List<InstrumentCatalog.Instrument> loadInstruments(String path) throws Exception {
        List<InstrumentCatalog.Instrument> cached = INSTRUMENT_CACHE.get(path);
        if (cached != null) {
            return cached;
        }

        List<InstrumentCatalog.Instrument> loaded = List.copyOf(InstrumentCatalog.loadInstruments(path));
        List<InstrumentCatalog.Instrument> existing = INSTRUMENT_CACHE.putIfAbsent(path, loaded);
        return existing == null ? loaded : existing;
    }

    record Prediction(
            String text,
            String assetType,
            String symbol,
            String assetScore,
            String symbolScore,
            String lexiconSymbol,
            List<String> topCandidates) {
    }

    record Level2Models(
            DocumentCategorizerME typedFocused,
            DocumentCategorizerME typed,
            DocumentCategorizerME globalFocused,
            DocumentCategorizerME global) {
    }
}
