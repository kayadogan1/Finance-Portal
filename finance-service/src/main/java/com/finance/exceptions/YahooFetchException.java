package com.finance.exceptions;

/**
 * Runtime exception used for yahoo fetch error cases.
 */
public class YahooFetchException extends RuntimeException {
    /**
     * Creates a new YahooFetchException with its required dependencies.
     *
     * @param message message value
     */
    public YahooFetchException(String message) {
        super(message);
    }
}
