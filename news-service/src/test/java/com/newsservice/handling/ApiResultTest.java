package com.newsservice.handling;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ApiResultTest {

    @Test
    void success_withDataBuildsSuccessfulResponse() {
        ApiResult<String> result = ApiResult.success("payload", "ok", 200);

        assertTrue(result.success());
        assertEquals("payload", result.data());
        assertNull(result.message());
        assertEquals(200, result.response());
        assertNotNull(result.timestamp());
    }

    @Test
    void success_withoutDataBuildsMessageResponse() {
        ApiResult<Void> result = ApiResult.success("queued", 202);

        assertFalse(result.success());
        assertNull(result.data());
        assertEquals("queued", result.message());
        assertEquals(202, result.response());
        assertNotNull(result.timestamp());
    }
}
