package com.finance.exceptions;

/**
 * Runtime exception used for insufficient balance error cases.
 */
public class InsufficientBalanceException extends RuntimeException {
    /**
     * Creates a new InsufficientBalanceException with its required dependencies.
     *
     * @param message message value
     */
    public InsufficientBalanceException(String message) {
        super(message);
    }
}
