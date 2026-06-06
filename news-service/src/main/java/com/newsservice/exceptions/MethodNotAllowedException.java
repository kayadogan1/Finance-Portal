package com.newsservice.exceptions;

/**
 * Runtime exception used for method not allowed error cases.
 */
public class MethodNotAllowedException extends RuntimeException {
    /**
     * Creates a new MethodNotAllowedException with its required dependencies.
     *
     * @param message message value
     */
    public MethodNotAllowedException(String message) {
        super(message);
    }
}
