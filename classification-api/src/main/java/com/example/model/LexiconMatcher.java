package com.example.model;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

public final class LexiconMatcher {

    private LexiconMatcher() {
    }

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

    static boolean isAmbiguousCryptoSymbol(String alias) {
        return Set.of("ATOM", "DOT", "FLOW", "ONE", "NEAR").contains(alias);
    }

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

    static boolean containsExactToken(String text, String token) {
        String pattern = "(^|[^A-Za-z0-9])" + Pattern.quote(token) + "([^A-Za-z0-9]|$)";
        return Pattern.compile(pattern).matcher(text == null ? "" : text).find();
    }

    static boolean containsForeignShortTickerSignal(String headline, String ticker) {
        String trimmed = headline == null ? "" : headline.trim();
        if (trimmed.startsWith(ticker + " ")) {
            return true;
        }
        return trimmed.contains("(" + ticker + ")");
    }

    static String aliasKind(InstrumentCatalog.Instrument instrument, String alias) {
        if (alias.equalsIgnoreCase(instrument.symbol())) {
            return "symbol";
        }
        if (alias.equalsIgnoreCase(instrument.canonicalName())) {
            return "canonical";
        }
        return "alias";
    }

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

    static List<String> allNames(InstrumentCatalog.Instrument instrument) {
        List<String> names = new ArrayList<>();
        names.add(instrument.canonicalName());
        names.add(instrument.symbol());
        names.addAll(instrument.aliases());
        return names;
    }

    static boolean containsPhrase(String normalizedHeadline, String normalizedNeedle) {
        if (normalizedNeedle.length() <= 1) {
            return false;
        }
        String pattern = "(^|[^a-z0-9])" + Pattern.quote(normalizedNeedle) + "([^a-z0-9]|$)";
        return Pattern.compile(pattern).matcher(normalizedHeadline).find();
    }

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

    record MatchedInstrument(InstrumentCatalog.Instrument instrument, AliasMatch alias) {
        double score() {
            return alias.score();
        }
    }

    record AliasMatch(String alias, String kind, double score) {
    }
}
