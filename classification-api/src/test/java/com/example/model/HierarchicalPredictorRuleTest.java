package com.example.model;

import junit.framework.TestCase;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class HierarchicalPredictorRuleTest extends TestCase {

    public void testResolveSymbolReturnsUnknownForOther() {
        String symbol = HierarchicalPredictor.resolveSymbol(
                "OTHER",
                Set.of(),
                Map.of("BTC", 0.10),
                null);

        assertEquals("UNKNOWN", symbol);
    }

    public void testResolveSymbolReturnsUnknownForLowConfidenceCompetition() {
        Map<String, Double> scores = new LinkedHashMap<>();
        scores.put("PGSUS", 0.0846);
        scores.put("MGROS", 0.0447);
        scores.put("SAHOL", 0.0635);

        String symbol = HierarchicalPredictor.resolveSymbol(
                "STOCK",
                Set.of("PGSUS", "MGROS", "SAHOL"),
                scores,
                null);

        assertEquals("UNKNOWN", symbol);
    }

    public void testMatcherTreatsMigrosAliasAsHighConfidence() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        List<LexiconMatcher.MatchedInstrument> matches =
                LexiconMatcher.matchHeadline(
                        "Migros yeni dagitim merkeziyle lojistik verimliligini artiracak",
                        instruments);

        assertFalse(matches.isEmpty());
        assertEquals("MGROS", matches.getFirst().instrument().symbol());
        assertTrue(HierarchicalPredictor.isHighConfidenceLexiconMatch(matches.getFirst(), matches));
    }

    public void testMatcherTreatsEurUsdAliasAsHighConfidence() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        List<LexiconMatcher.MatchedInstrument> matches =
                LexiconMatcher.matchHeadline(
                        "EUR/USD paritesi ECB mesajlari sonrasi geriledi",
                        instruments);

        assertFalse(matches.isEmpty());
        assertEquals("EURUSD", matches.getFirst().instrument().symbol());
        assertTrue(HierarchicalPredictor.isHighConfidenceLexiconMatch(matches.getFirst(), matches));
    }

    public void testMatcherSkipsAmbiguousForeignTickerWords() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        List<LexiconMatcher.MatchedInstrument> matches =
                LexiconMatcher.matchHeadline(
                        "Nvidia yeni cip ailesiyle veri merkezi gelirlerini artirmayi hedefliyor",
                        instruments);

        assertTrue(matches.stream().noneMatch(match -> "VERI".equals(match.instrument().symbol())));
    }

    public void testMatcherSkipsLowercaseTickerLikeWordForBist() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        List<LexiconMatcher.MatchedInstrument> matches =
                LexiconMatcher.matchHeadline(
                        "İşbank yeşil finansman projelerine ayirdigi kaynagi buyuttu",
                        instruments);

        assertTrue(matches.stream().noneMatch(match -> "YESIL".equals(match.instrument().symbol())));
    }

    public void testMatcherFindsAppleAlias() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        List<LexiconMatcher.MatchedInstrument> matches =
                LexiconMatcher.matchHeadline(
                        "Apple tedarik zinciri beklentileriyle primli acildi",
                        instruments);

        assertTrue(matches.stream().anyMatch(match -> "AAPL".equals(match.instrument().symbol())));
    }

    public void testMatcherFindsViop30Alias() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        List<LexiconMatcher.MatchedInstrument> matches =
                LexiconMatcher.matchHeadline(
                        "VIOP 30 kontratlarinda acilis sonrasi hacim artti",
                        instruments);

        assertTrue(matches.stream().anyMatch(match -> "F_XU030".equals(match.instrument().symbol())));
    }

    public void testMatcherFindsTeslaAlias() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        List<LexiconMatcher.MatchedInstrument> matches =
                LexiconMatcher.matchHeadline(
                        "Tesla yeni model teslimatlarina iliskin beklentileri karsilayamadi",
                        instruments);

        assertTrue(matches.stream().anyMatch(match -> "TSLA".equals(match.instrument().symbol())));
    }

    public void testAmbiguousCompetingLexiconMatchDetectedForMultipleStocks() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        List<LexiconMatcher.MatchedInstrument> matches =
                LexiconMatcher.matchHeadline(
                        "Apple ve Microsoft yapay zeka yatirimlariyla teknoloji hisselerini destekledi",
                        instruments);

        assertFalse(matches.isEmpty());
        assertTrue(matches.stream().anyMatch(match -> "AAPL".equals(match.instrument().symbol())));
        assertTrue(matches.stream().anyMatch(match -> "MSFT".equals(match.instrument().symbol())));
        assertTrue(HierarchicalPredictor.hasAmbiguousCompetingLexiconMatch(matches.getFirst(), matches));
    }

    public void testConservativePredictReturnsUnknownSymbolForMultipleStrongEntities() throws Exception {
        HierarchicalPredictor.Prediction prediction = HierarchicalPredictor.predictConservative(
                "Apple ve Microsoft yapay zeka yatirimlariyla teknoloji hisselerini destekledi");

        assertEquals("STOCK", prediction.assetType());
        assertEquals("UNKNOWN", prediction.symbol());
        assertNull(prediction.lexiconSymbol());
    }

    public void testMatcherSkipsForeignShortTickerUsedAsWord() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        List<LexiconMatcher.MatchedInstrument> matches =
                LexiconMatcher.matchHeadline(
                        "It is very hard not to be bullish on AI and crypto right now",
                        instruments);

        assertTrue(matches.stream().noneMatch(match -> "ON".equals(match.instrument().symbol())));
    }

    public void testMatcherSkipsForeignShortCountryToken() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        List<LexiconMatcher.MatchedInstrument> matches =
                LexiconMatcher.matchHeadline(
                        "Zurich UK unit sets up support service for advisers",
                        instruments);

        assertTrue(matches.stream().noneMatch(match -> "UK".equals(match.instrument().symbol())));
    }

    public void testMatcherSkipsCryptoTickerInsideDotComPhrase() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        List<LexiconMatcher.MatchedInstrument> matches =
                LexiconMatcher.matchHeadline(
                        "Review & Preview: Dot-Com Glory Days",
                        instruments);

        assertTrue(matches.stream().noneMatch(match -> "DOT".equals(match.instrument().symbol())));
    }

    public void testPredictDoesNotClassifyNonCryptoShockHeadlineAsAtom() throws Exception {
        HierarchicalPredictor.Prediction prediction = HierarchicalPredictor.predict(
                "İslam Memişten çok sert soygun çıkışı Piyasalarda Hürmüz Boğazı depremi Hürmüz Boğazındaki gerilim piyasaları yeniden ateşe verdi.");

        assertEquals("OTHER", prediction.assetType());
        assertEquals("UNKNOWN", prediction.symbol());
    }

    public void testCryptoContextStillAllowsBitcoinPrediction() throws Exception {
        HierarchicalPredictor.Prediction prediction = HierarchicalPredictor.predict(
                "Strive Asset Management builds Bitcoin exposure per share for investors");

        assertEquals("CRYPTO", prediction.assetType());
        assertEquals("BTC", prediction.symbol());
    }

    public void testAppleHeadlineDoesNotPreferBenchmarkComparisonIndex() throws Exception {
        HierarchicalPredictor.Prediction prediction = HierarchicalPredictor.predict(
                "Goldman Sachs reassesses Apple stock ahead of earnings Apple is heading into its April 30 earnings report, "
                        + "with investors focused on iPhone demand and compared with a 4.67% gain for the S&P 500 index");

        assertEquals("STOCK", prediction.assetType());
        assertEquals("AAPL", prediction.symbol());
        assertTrue(prediction.topCandidates().stream().noneMatch(candidate -> candidate.startsWith("XU030")));
        assertTrue(prediction.topCandidates().stream().noneMatch(candidate -> candidate.startsWith("XBANK")));
    }

    public void testTopCandidatesDoNotExposeLowConfidenceModelGuesses() throws Exception {
        HierarchicalPredictor.Prediction prediction = HierarchicalPredictor.predict(
                "Muhasebe hatası skandalıyla sarsılan İngiliz perakende devi WH Smith hisseleri çakıldı");

        assertTrue(prediction.topCandidates().isEmpty());
    }

    public void testMultiEntityHeadlineReturnsLexiconRelatedCandidatesOnly() throws Exception {
        HierarchicalPredictor.Prediction prediction = HierarchicalPredictor.predict(
                "Mag 7 earnings spotlight Amazon Alphabet Microsoft Meta and Apple report results this week");

        assertEquals("STOCK", prediction.assetType());
        assertTrue(prediction.topCandidates().stream().anyMatch(candidate -> candidate.startsWith("AAPL")
                || candidate.startsWith("MSFT")
                || candidate.startsWith("AMZN")
                || candidate.startsWith("META")
                || candidate.startsWith("GOOG")
                || candidate.startsWith("GOOGL")));
        assertTrue(prediction.topCandidates().stream().noneMatch(candidate -> candidate.startsWith("XU030")));
        assertTrue(prediction.topCandidates().stream().noneMatch(candidate -> candidate.startsWith("XBANK")));
    }
}
