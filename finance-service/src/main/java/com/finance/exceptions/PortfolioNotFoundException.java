package com.finance.exceptions;

/**
 * Runtime exception used for portfolio not found error cases.
 */
public class PortfolioNotFoundException extends RuntimeException {
    /**
     * Creates a new PortfolioNotFoundException with its required dependencies.
     *
     * @param message message value
     */
    public PortfolioNotFoundException(String message) {
        super(message);
    }
}
