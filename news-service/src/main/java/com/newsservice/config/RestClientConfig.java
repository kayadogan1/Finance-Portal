package com.newsservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Spring configuration for rest client.
 */
@Configuration
public class RestClientConfig {

    /**
     * Returns the result of rest client.
     *
     * @return rest client result
     */
    @Bean
    public RestClient restClient() {
        return RestClient.create();
    }

}