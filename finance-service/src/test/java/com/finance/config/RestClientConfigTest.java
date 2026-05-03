package com.finance.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class RestClientConfigTest {

    @Test
    void restClient_returnsClientInstance() {
        RestClientConfig config = new RestClientConfig();

        assertNotNull(config.restClient());
    }
}
