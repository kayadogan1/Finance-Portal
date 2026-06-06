package com.finance.exceptions;

/**
 * Runtime exception used for bad request error cases.
 */
public class BadRequestException extends RuntimeException {
    /**
     * Creates a new BadRequestException with its required dependencies.
     *
     * @param message message value
     */
    public BadRequestException(String message) {
        super(message);
    }
}
