package com.finance.handling;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ApiResultTest {

    @Test
    void success_factoryBuildsSuccessfulResponse() {
        ApiResult<String> result = ApiResult.success("ok", "done", 200);

        assertTrue(result.success());
        assertEquals("ok", result.data());
        assertEquals("done", result.message());
        assertEquals(200, result.response());
        assertNotNull(result.timestamp());
    }
}
