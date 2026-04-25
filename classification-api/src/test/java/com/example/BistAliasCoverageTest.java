package com.example;

import junit.framework.TestCase;

import java.util.List;

public class BistAliasCoverageTest extends TestCase {

    public void testImportedCatalogContainsCriticalBistAliases() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        assertHasAlias(instruments, "THYAO", "THY");
        assertHasAlias(instruments, "GARAN", "Garanti BBVA");
        assertHasAlias(instruments, "TUPRS", "Tüpraş");
        assertHasAlias(instruments, "SISE", "Şişecam");
        assertHasAlias(instruments, "TTKOM", "Türk Telekom");
    }

    public void testHeadlineMatcherFindsCriticalTurkishAliases() throws Exception {
        List<InstrumentCatalog.Instrument> instruments =
                InstrumentCatalog.loadInstruments("src/main/resources/data/instruments.csv");

        assertBestMatch(instruments,
                "THY yolcu doluluk oraninda mart ayinda guclu performans sergiledi",
                "THYAO");
        assertBestMatch(instruments,
                "Garanti BBVA ilk ceyrek karini beklentilerin uzerinde acikladi",
                "GARAN");
        assertBestMatch(instruments,
                "Tüpraş rafineri marjlarindaki guclenmeyle one cikti",
                "TUPRS");
        assertBestMatch(instruments,
                "Türk Telekom fiber altyapi yatirimlarini artiriyor",
                "TTKOM");
    }

    private void assertHasAlias(List<InstrumentCatalog.Instrument> instruments, String symbol, String alias) {
        InstrumentCatalog.Instrument instrument = instruments.stream()
                .filter(item -> symbol.equals(item.symbol()))
                .findFirst()
                .orElseThrow();

        assertTrue("Expected alias not found for " + symbol + ": " + alias,
                instrument.aliases().contains(alias));
    }

    private void assertBestMatch(List<InstrumentCatalog.Instrument> instruments, String headline, String expectedSymbol) {
        List<LexiconMatcher.MatchedInstrument> matches =
                LexiconMatcher.matchHeadline(headline, instruments);

        assertFalse("No match found for headline: " + headline, matches.isEmpty());
        assertEquals(expectedSymbol, matches.getFirst().instrument().symbol());
    }
}
