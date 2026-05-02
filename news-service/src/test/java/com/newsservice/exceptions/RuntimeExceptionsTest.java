package com.newsservice.exceptions;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RuntimeExceptionsTest {

    @Test
    void badRequestException_preservesMessage() {
        assertEquals("bad", new BadRequestException("bad").getMessage());
    }

    @Test
    void authenticationException_preservesMessage() {
        assertEquals("auth", new AuthenticationException("auth").getMessage());
    }

    @Test
    void methodNotAllowedException_preservesMessage() {
        assertEquals("method", new MethodNotAllowedException("method").getMessage());
    }

    @Test
    void notFoundException_preservesMessage() {
        assertEquals("missing", new NotFoundException("missing").getMessage());
    }
}
