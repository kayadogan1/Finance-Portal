package com.finance.handling;

import com.finance.exceptions.*;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionAdvisorTest {

    private final GlobalExceptionAdvisor advisor = new GlobalExceptionAdvisor();

    @Test
    void handleNotFoundException_returns404Payload() {
        ApiResult<String> result = advisor.handleNotFoundException(new NotFoundException("missing"));

        assertFalse(result.success());
        assertEquals("missing", result.message());
        assertEquals(404, result.response());
        assertNotNull(result.timestamp());
    }

    @Test
    void handleBadRequestException_returns400Payload() {
        ApiResult<String> result = advisor.handleBadRequestException(new BadRequestException("bad"));

        assertEquals(400, result.response());
        assertEquals("bad", result.message());
    }

    @Test
    void handleAuthenticationException_returns401Payload() {
        ApiResult<String> result = advisor.handleAuthenticationException(new AuthenticationException("auth"));

        assertEquals(401, result.response());
        assertEquals("auth", result.message());
    }

    @Test
    void handleGeneral_returns500Payload() {
        ApiResult<String> result = advisor.handleGeneral(new RuntimeException("boom"));

        assertEquals(500, result.response());
        assertEquals("boom", result.message());
    }

    @Test
    void handleYahooFetchException_returnsPayloadWith500Code() {
        ApiResult<String> result = advisor.handleYahooFetchException(new YahooFetchException("rate limit"));

        assertEquals(500, result.response());
        assertEquals("rate limit", result.message());
    }
}
