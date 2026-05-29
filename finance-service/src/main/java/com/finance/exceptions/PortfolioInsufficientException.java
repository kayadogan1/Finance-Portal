package com.finance.exceptions;

public class PortfolioInsufficientException extends RuntimeException {
    public PortfolioInsufficientException(String message) {
        super(message);
    }
}
