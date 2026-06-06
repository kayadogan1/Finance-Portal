package com.finance.shared;

/**
 * Data transfer object that carries fetch task data.
 */
public record FetchTask(String dbSymbol, String category, Currency currency) {
}
