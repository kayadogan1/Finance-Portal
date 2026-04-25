package com.example;

import junit.framework.TestCase;

public class ClassificationAuditLoggerTest extends TestCase {

    public void testEscapeQuotesAndCommas() {
        assertEquals("\"AAPL, \"\"Apple\"\"\"", ClassificationAuditLogger.escape("AAPL, \"Apple\""));
    }

    public void testEscapeNullAsEmpty() {
        assertEquals("", ClassificationAuditLogger.escape(null));
    }
}
