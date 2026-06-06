package com.example.model;

import com.example.service.NewsTextNormalizer;

import opennlp.tools.doccat.DoccatModel;
import opennlp.tools.doccat.DocumentCategorizerME;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

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

/**
 * Domain model that represents hierarchical predictor data.
 */
public class HierarchicalPredictor {

    private static final Logger logger = LogManager.getLogger(HierarchicalPredictor.class);

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

    /**
     * Starts the application.
     *
     * @param args command-line arguments passed to the application
     * @throws Exception when the operation cannot be completed
     */
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

    /**
     * Returns the result of predict.
     *
     * @param text text value
     * @return predict result
     * @throws Exception when the operation cannot be completed
     */
    public static Prediction predict(String text) throws Exception {
        return predictInternal(text, false);
    }

    /**
     * Returns the result of predict conservative.
     *
     * @param text text value
     * @return predict conservative result
     * @throws Exception when the operation cannot be completed
     */
    public static Prediction predictConservative(String text) throws Exception {
        return predictInternal(text, true);
    }

    /**
     * Returns the result of predict internal.
     *
     * @param text text value
     * @param conservative conservative value
     * @return predict internal result
     * @throws Exception when the operation cannot be completed
     */
    static Prediction predictInternal(String text, boolean conservative) throws Exception {
        long startedAt = System.currentTimeMillis();
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

        Prediction prediction = new Prediction(
                text,
                assetType,
                symbol,
                topScore(typeScores),
                scoreOf(symbol, symbolScoreMap),
                lexiconSymbol,
                topCandidates);

        logger.debug(
                "Prediction resolved. mode={}, assetType={}, symbol={}, lexiconSymbol={}, candidateCount={}, durationMs={}",
                conservative ? "conservative" : "standard",
                prediction.assetType(),
                prediction.symbol(),
                prediction.lexiconSymbol(),
                prediction.topCandidates() != null ? prediction.topCandidates().size() : 0,
                System.currentTimeMillis() - startedAt
        );
        return prediction;
    }

    /**
     * Returns the result of load.
     *
     * @param modelName model name value
     * @return load result
     * @throws IOException when the operation cannot be completed
     */
    static DocumentCategorizerME load(String modelName) throws IOException {
        return new DocumentCategorizerME(loadModel(modelName));
    }

    /**
     * Returns the result of load level2 models.
     *
     * @param assetType asset type value
     * @return load level2 models result
     * @throws IOException when the operation cannot be completed
     */
    static Level2Models loadLevel2Models(String assetType) throws IOException {
        return new Level2Models(
                loadIfExists("tr-doccat-level2-" + assetType + "-focused.bin"),
                loadIfExists("tr-doccat-level2-" + assetType + ".bin"),
                loadIfExists("tr-doccat-level2-focused.bin"),
                load("tr-doccat-level2.bin"));
    }

    /**
     * Returns the result of load if exists.
     *
     * @param modelName model name value
     * @return load if exists result
     * @throws IOException when the operation cannot be completed
     */
    static DocumentCategorizerME loadIfExists(String modelName) throws IOException {
        if (!modelExists(modelName)) {
            return null;
        }
        return load(modelName);
    }

    /**
     * Returns the result of load model.
     *
     * @param modelName model name value
     * @return load model result
     * @throws IOException when the operation cannot be completed
     */
    static DoccatModel loadModel(String modelName) throws IOException {
        String cacheKey = modelCacheKey(modelName);
        DoccatModel cached = MODEL_CACHE.get(cacheKey);
        if (cached != null) {
            logger.debug("Model cache hit. model={}", modelName);
            return cached;
        }

        try (InputStream input = openModelStream(modelName)) {
            DoccatModel loaded = new DoccatModel(input);
            DoccatModel existing = MODEL_CACHE.putIfAbsent(cacheKey, loaded);
            logger.info("Model loaded. model={}, sourceKey={}", modelName, cacheKey);
            return existing == null ? loaded : existing;
        }
    }

    /**
     * Returns the result of model cache key.
     *
     * @param modelName model name value
     * @return model cache key result
     */
    static String modelCacheKey(String modelName) {
        String externalModelDir = System.getProperty(EXTERNAL_MODEL_DIR_PROP);
        String modelRoot = externalModelDir == null || externalModelDir.isBlank()
                ? "classpath-or-local"
                : new File(externalModelDir).getAbsolutePath();
        return modelRoot + "/" + modelName;
    }

    /**
     * Returns the result of model exists.
     *
     * @param modelName model name value
     * @return true when model exists succeeds or matches its condition
     */
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

    /**
     * Returns the result of open model stream.
     *
     * @param modelName model name value
     * @return open model stream result
     * @throws IOException when the operation cannot be completed
     */
    static InputStream openModelStream(String modelName) throws IOException {
        String externalModelDir = System.getProperty(EXTERNAL_MODEL_DIR_PROP);
        if (externalModelDir != null && !externalModelDir.isBlank()) {
            File externalFile = new File(externalModelDir, modelName);
            if (externalFile.exists()) {
                logger.debug("Opening model from external directory. model={}, dir={}", modelName, externalModelDir);
                return new FileInputStream(externalFile);
            }
        }

        File localFile = new File(MODEL_DIR + modelName);
        if (localFile.exists()) {
            logger.debug("Opening model from local filesystem. model={}", modelName);
            return new FileInputStream(localFile);
        }

        InputStream resource = HierarchicalPredictor.class.getClassLoader()
                .getResourceAsStream("models/" + modelName);
        if (resource != null) {
            logger.debug("Opening model from classpath resource. model={}", modelName);
            return resource;
        }

        logger.error("Model could not be found. model={}", modelName);
        throw new IOException("Model bulunamadi: " + modelName);
    }

    /**
     * Returns the result of combine score maps.
     *
     * @param models models value
     * @param tokens tokens value
     * @return combine score maps result
     */
    static Map<String, Double> combineScoreMaps(Level2Models models, String[] tokens) {
        Map<String, Double> combined = new LinkedHashMap<>();
        addWeightedScores(combined, models.typedFocused(), tokens, TYPED_FOCUSED_WEIGHT);
        addWeightedScores(combined, models.typed(), tokens, TYPED_WEIGHT);
        addWeightedScores(combined, models.globalFocused(), tokens, GLOBAL_FOCUSED_WEIGHT);
        addWeightedScores(combined, models.global(), tokens, GLOBAL_WEIGHT);
        return combined;
    }

    /**
     * Performs add weighted scores.
     *
     * @param combined combined value
     * @param model model value
     * @param tokens tokens value
     * @param weight weight value
     */
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

    /**
     * Converts data to kenize.
     *
     * @param text text value
     * @return tokenize result
     */
    static String[] tokenize(String text) {
        return Arrays.stream(text.split("\\s+"))
                .map(String::trim)
                .filter(token -> !token.isBlank())
                .toArray(String[]::new);
    }

    /**
     * Converts data to p score.
     *
     * @param probs probs value
     * @return top score result
     */
    static String topScore(double[] probs) {
        double max = 0.0;
        for (double prob : probs) {
            max = Math.max(max, prob);
        }
        return String.format("%.4f", max);
    }

    /**
     * Returns the result of best symbol for type.
     *
     * @param allowedSymbols allowed symbols value
     * @param scoreMap score map value
     * @return best symbol for type result
     */
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

    /**
     * Returns the result of resolve symbol.
     *
     * @param assetType asset type value
     * @param allowedSymbols allowed symbols value
     * @param scoreMap score map value
     * @param lexiconSymbol lexicon symbol value
     * @return resolve symbol result
     */
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

    /**
     * Returns the result of score of.
     *
     * @param symbol instrument symbol used to locate market data
     * @param scoreMap score map value
     * @return score of result
     */
    static String scoreOf(String symbol, Map<String, Double> scoreMap) {
        return String.format("%.4f", scoreMap.getOrDefault(symbol, 0.0));
    }

    /**
     * Returns the result of best contextual lexicon match.
     *
     * @param text text value
     * @param matches matches value
     * @return best contextual lexicon match result
     */
    static LexiconMatcher.MatchedInstrument bestContextualLexiconMatch(
            String text,
            List<LexiconMatcher.MatchedInstrument> matches) {

        return matches.stream()
                .max(Comparator.comparingDouble(match -> contextualLexiconScore(text, match)))
                .orElse(matches.getFirst());
    }

    /**
     * Returns the result of contextual lexicon score.
     *
     * @param text text value
     * @param match match value
     * @return contextual lexicon score result
     */
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

    /**
     * Returns the result of related lexicon candidates.
     *
     * @param text text value
     * @param matches matches value
     * @param selectedSymbol selected symbol value
     * @return related lexicon candidates result
     */
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

    /**
     * Indicates whether high confidence related match.
     *
     * @param text text value
     * @param match match value
     * @return true when is high confidence related match succeeds or matches its condition
     */
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

    /**
     * Returns the result of normalized index of.
     *
     * @param text text value
     * @param alias alias value
     * @return normalized index of result
     */
    static int normalizedIndexOf(String text, String alias) {
        String normalizedText = LexiconMatcher.normalize(text == null ? "" : text);
        String normalizedAlias = LexiconMatcher.normalize(alias == null ? "" : alias);
        return normalizedText.indexOf(normalizedAlias);
    }

    /**
     * Returns the result of has stock context near alias.
     *
     * @param text text value
     * @param alias alias value
     * @return true when has stock context near alias succeeds or matches its condition
     */
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

    /**
     * Indicates whether benchmark comparison context.
     *
     * @param text text value
     * @param alias alias value
     * @return true when is benchmark comparison context succeeds or matches its condition
     */
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

    /**
     * Returns the result of looks like ticker alias.
     *
     * @param alias alias value
     * @return true when looks like ticker alias succeeds or matches its condition
     */
    static boolean looksLikeTickerAlias(String alias) {
        return alias.equals(alias.toUpperCase()) && alias.length() >= 3 && alias.length() <= 5;
    }

    /**
     * Indicates whether high confidence lexicon match.
     *
     * @param bestMatch best match value
     * @param allMatches all matches value
     * @return true when is high confidence lexicon match succeeds or matches its condition
     */
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

    /**
     * Returns the result of has ambiguous competing lexicon match.
     *
     * @param bestMatch best match value
     * @param allMatches all matches value
     * @return true when has ambiguous competing lexicon match succeeds or matches its condition
     */
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

    /**
     * Indicates whether strong competing entity match.
     *
     * @param match match value
     * @return true when is strong competing entity match succeeds or matches its condition
     */
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

    /**
     * Returns the result of allowed symbols.
     *
     * @param assetType asset type value
     * @return allowed symbols result
     * @throws Exception when the operation cannot be completed
     */
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

    /**
     * Returns the result of load instruments.
     *
     * @param path path value
     * @return load instruments result
     * @throws Exception when the operation cannot be completed
     */
    static List<InstrumentCatalog.Instrument> loadInstruments(String path) throws Exception {
        List<InstrumentCatalog.Instrument> cached = INSTRUMENT_CACHE.get(path);
        if (cached != null) {
            return cached;
        }

        List<InstrumentCatalog.Instrument> loaded = List.copyOf(InstrumentCatalog.loadInstruments(path));
        List<InstrumentCatalog.Instrument> existing = INSTRUMENT_CACHE.putIfAbsent(path, loaded);
        return existing == null ? loaded : existing;
    }

    /**
     * Data transfer object that carries prediction data.
     */
    public record Prediction(
            String text,
            String assetType,
            String symbol,
            String assetScore,
            String symbolScore,
            String lexiconSymbol,
            List<String> topCandidates) {
    }

    /**
     * Data transfer object that carries level2 models data.
     */
    record Level2Models(
            DocumentCategorizerME typedFocused,
            DocumentCategorizerME typed,
            DocumentCategorizerME globalFocused,
            DocumentCategorizerME global) {
    }
}
