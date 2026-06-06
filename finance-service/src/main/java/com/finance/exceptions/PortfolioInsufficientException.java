package com.finance.exceptions;

/**
 * Runtime exception used for portfolio insufficient error cases.
 */
public class PortfolioInsufficientException extends RuntimeException {
    /**
     * Creates a new PortfolioInsufficientException with its required dependencies.
     *
     * @param message message value
     */
    public PortfolioInsufficientException(String message) {
        super(message);
    }
}
