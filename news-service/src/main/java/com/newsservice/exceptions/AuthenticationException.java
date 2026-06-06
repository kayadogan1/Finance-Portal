package com.newsservice.exceptions;

/**
 * Runtime exception used for authentication error cases.
 */
public class AuthenticationException  extends RuntimeException{
    /**
     * Creates a new AuthenticationException with its required dependencies.
     *
     * @param message message value
     */
    public AuthenticationException(String message) {
        super(message);
    }
}
