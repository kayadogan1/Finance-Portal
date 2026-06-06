package com.finance.exceptions;

/**
 * Runtime exception used for not found error cases.
 */
public class NotFoundException extends RuntimeException {
    /**
     * Creates a new NotFoundException with its required dependencies.
     *
     * @param message message value
     */
    public NotFoundException(String message) {
        super(message);
    }
}
