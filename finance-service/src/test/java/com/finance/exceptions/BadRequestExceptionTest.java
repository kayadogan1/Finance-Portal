package com.finance.exceptions;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class BadRequestExceptionTest {

    @Test
    void constructor_setsMessage() {
        BadRequestException exception = new BadRequestException("bad request");
        assertEquals("bad request", exception.getMessage());
    }
}
