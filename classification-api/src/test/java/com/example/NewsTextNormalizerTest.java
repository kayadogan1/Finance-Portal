package com.example;

import junit.framework.TestCase;

public class NewsTextNormalizerTest extends TestCase {

    public void testNormalizeRemovesHtmlAndWhitespace() {
        assertEquals(
                "THY hisseleri yükseldi & yatırımcı ilgisi arttı",
                NewsTextNormalizer.normalize("<p>THY&nbsp; hisseleri yükseldi &amp; yatırımcı ilgisi arttı</p>"));
    }

    public void testCombineSkipsDuplicateDescription() {
        assertEquals(
                "GARAN bilanço açıkladı",
                NewsTextNormalizer.combine("GARAN bilanço açıkladı", "GARAN bilanço açıkladı"));
    }
}
