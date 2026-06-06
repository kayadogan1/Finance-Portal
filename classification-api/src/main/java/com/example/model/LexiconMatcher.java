package com.example.model;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Domain model that represents lexicon matcher data.
 */
public final class LexiconMatcher {

    /**
     * Creates a new LexiconMatcher with its required dependencies.
     */
    private LexiconMatcher() {
    }

    /**
     * Returns the result of match headline.
     *
     * @param headline headline value
     * @param instruments instruments value
     * @return match headline result
     */
    static List<MatchedInstrument> matchHeadline(
            String headline,
            List<InstrumentCatalog.Instrument> instruments) {

        List<MatchedInstrument> matches = new ArrayList<>();
        String normalizedHeadline = normalize(headline);

        for (InstrumentCatalog.Instrument instrument : instruments) {
            AliasMatch bestAlias = null;

            for (String alias : allNames(instrument)) {
                if (alias == null || alias.isBlank() || shouldSkipAliasMatch(headline, instrument, alias)) {
                    continue;
                }
                String normalizedAlias = normalize(alias);
                if (containsPhrase(normalizedHeadline, normalizedAlias)) {
                    AliasMatch candidate = new AliasMatch(alias, aliasKind(instrument, alias), aliasScore(alias));
                    if (bestAlias == null || candidate.score() > bestAlias.score()) {
                        bestAlias = candidate;
                    }
                }
            }

            if (bestAlias != null) {
                matches.add(new MatchedInstrument(instrument, bestAlias));
            }
        }

        matches.sort(Comparator
                .comparingDouble(MatchedInstrument::score).reversed()
                .thenComparing(match -> match.instrument().symbol()));
        return matches;
    }

    /**
     * Returns the result of should skip alias match.
     *
     * @param headline headline value
     * @param instrument instrument value
     * @param alias alias value
     * @return true when should skip alias match succeeds or matches its condition
     */
    static boolean shouldSkipAliasMatch(
            String headline,
            InstrumentCatalog.Instrument instrument,
            String alias) {

        if (!alias.equalsIgnoreCase(instrument.symbol())) {
            return false;
        }
        if ("CRYPTO".equals(instrument.assetType())) {
            return shouldSkipCryptoSymbolAlias(headline, alias);
        }
        if (!"STOCK".equals(instrument.assetType())) {
            return false;
        }
        if ("BIST".equals(instrument.exchange())) {
            if (!alias.matches("[A-Z]{3,5}")) {
                return false;
            }
            return !containsExactToken(headline, alias);
        }

        if (alias.matches("[A-Z]{1,2}")) {
            return !containsForeignShortTickerSignal(headline, alias);
        }
        if (alias.matches("[A-Z]{3,5}")) {
            return !containsExactToken(headline, alias);
        }
        return false;
    }

    /**
     * Returns the result of should skip crypto symbol alias.
     *
     * @param headline headline value
     * @param alias alias value
     * @return true when should skip crypto symbol alias succeeds or matches its condition
     */
    static boolean shouldSkipCryptoSymbolAlias(String headline, String alias) {
        if (!alias.matches("[A-Z]{2,5}")) {
            return false;
        }
        if (!containsExactToken(headline, alias)) {
            return true;
        }
        if (!isAmbiguousCryptoSymbol(alias)) {
            return false;
        }
        return !containsCryptoContext(headline);
    }

    /**
     * Indicates whether ambiguous crypto symbol.
     *
     * @param alias alias value
     * @return true when is ambiguous crypto symbol succeeds or matches its condition
     */
    static boolean isAmbiguousCryptoSymbol(String alias) {
        return Set.of("ATOM", "DOT", "FLOW", "ONE", "NEAR").contains(alias);
    }

    /**
     * Returns the result of contains crypto context.
     *
     * @param headline headline value
     * @return true when contains crypto context succeeds or matches its condition
     */
    static boolean containsCryptoContext(String headline) {
        String normalized = normalize(headline);
        return normalized.contains("crypto")
                || normalized.contains("kripto")
                || normalized.contains("bitcoin")
                || normalized.contains("ethereum")
                || normalized.contains("blockchain")
                || normalized.contains("coin")
                || normalized.contains("token")
                || normalized.contains("stablecoin")
                || normalized.contains("binance")
                || normalized.contains("defi")
                || normalized.contains("wallet")
                || normalized.contains("cuzdan")
                || normalized.contains("usdt")
                || normalized.contains("btc/usd")
                || normalized.contains("eth/usd");
    }

    /**
     * Returns the result of contains exact token.
     *
     * @param text text value
     * @param token token value
     * @return true when contains exact token succeeds or matches its condition
     */
    static boolean containsExactToken(String text, String token) {
        String pattern = "(^|[^A-Za-z0-9])" + Pattern.quote(token) + "([^A-Za-z0-9]|$)";
        return Pattern.compile(pattern).matcher(text == null ? "" : text).find();
    }

    /**
     * Returns the result of contains foreign short ticker signal.
     *
     * @param headline headline value
     * @param ticker ticker value
     * @return true when contains foreign short ticker signal succeeds or matches its condition
     */
    static boolean containsForeignShortTickerSignal(String headline, String ticker) {
        String trimmed = headline == null ? "" : headline.trim();
        if (trimmed.startsWith(ticker + " ")) {
            return true;
        }
        return trimmed.contains("(" + ticker + ")");
    }

    /**
     * Returns the result of alias kind.
     *
     * @param instrument instrument value
     * @param alias alias value
     * @return alias kind result
     */
    static String aliasKind(InstrumentCatalog.Instrument instrument, String alias) {
        if (alias.equalsIgnoreCase(instrument.symbol())) {
            return "symbol";
        }
        if (alias.equalsIgnoreCase(instrument.canonicalName())) {
            return "canonical";
        }
        return "alias";
    }

    /**
     * Returns the result of alias score.
     *
     * @param alias alias value
     * @return alias score result
     */
    static double aliasScore(String alias) {
        if (alias == null) {
            return 0.0;
        }
        String trimmed = alias.trim();
        double score = Math.min(1.0, trimmed.length() / 12.0);
        if (trimmed.equals(trimmed.toUpperCase()) && trimmed.length() >= 3 && trimmed.length() <= 6) {
            score += 0.15;
        }
        if (trimmed.contains(" ")) {
            score += 0.10;
        }
        return Math.min(score, 1.2);
    }

    /**
     * Returns the result of all names.
     *
     * @param instrument instrument value
     * @return all names result
     */
    static List<String> allNames(InstrumentCatalog.Instrument instrument) {
        List<String> names = new ArrayList<>();
        names.add(instrument.canonicalName());
        names.add(instrument.symbol());
        names.addAll(instrument.aliases());
        return names;
    }

    /**
     * Returns the result of contains phrase.
     *
     * @param normalizedHeadline normalized headline value
     * @param normalizedNeedle normalized needle value
     * @return true when contains phrase succeeds or matches its condition
     */
    static boolean containsPhrase(String normalizedHeadline, String normalizedNeedle) {
        if (normalizedNeedle.length() <= 1) {
            return false;
        }
        String pattern = "(^|[^a-z0-9])" + Pattern.quote(normalizedNeedle) + "([^a-z0-9]|$)";
        return Pattern.compile(pattern).matcher(normalizedHeadline).find();
    }

    /**
     * Returns the result of normalize.
     *
     * @param text text value
     * @return normalize result
     */
    static String normalize(String text) {
        return (text == null ? "" : text)
                .toLowerCase()
                .replace('ı', 'i')
                .replace('İ', 'i')
                .replace('ş', 's')
                .replace('Ş', 's')
                .replace('ğ', 'g')
                .replace('Ğ', 'g')
                .replace('ü', 'u')
                .replace('Ü', 'u')
                .replace('ö', 'o')
                .replace('Ö', 'o')
                .replace('ç', 'c')
                .replace('Ç', 'c');
    }

    /**
     * Data transfer object that carries matched instrument data.
     */
    record MatchedInstrument(InstrumentCatalog.Instrument instrument, AliasMatch alias) {
        double score() {
            return alias.score();
        }
    }

    /**
     * Data transfer object that carries alias match data.
     */
    record AliasMatch(String alias, String kind, double score) {
    }
}
