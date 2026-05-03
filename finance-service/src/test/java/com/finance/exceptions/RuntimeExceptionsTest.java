package com.finance.exceptions;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RuntimeExceptionsTest {

    @Test
    void notFoundException_keepsMessage() {
        assertEquals("missing", new NotFoundException("missing").getMessage());
    }

    @Test
    void authenticationException_keepsMessage() {
        assertEquals("auth", new AuthenticationException("auth").getMessage());
    }

    @Test
    void methodNotAllowedException_keepsMessage() {
        assertEquals("nope", new MethodNotAllowedException("nope").getMessage());
    }

    @Test
    void yahooFetchException_keepsMessage() {
        assertEquals("rate", new YahooFetchException("rate").getMessage());
    }
}
