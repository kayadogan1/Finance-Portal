package com.apigateway.rateLimit;

import io.github.bucket4j.Bucket;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;

class GatewayRateLimiterTest {

    private final GatewayRateLimiter rateLimiter = new GatewayRateLimiter();

    @Test
    void resolveBucket_reusesBucketForSameClientAndService() {
        Bucket first = rateLimiter.resolveBucket("192.0.2.10", "finance");
        Bucket second = rateLimiter.resolveBucket("192.0.2.10", "finance");

        assertSame(first, second);
    }

    @Test
    void resolveBucket_usesSeparateBucketsForDifferentServices() {
        Bucket financeBucket = rateLimiter.resolveBucket("192.0.2.10", "finance");
        Bucket newsBucket = rateLimiter.resolveBucket("192.0.2.10", "news");

        assertNotSame(financeBucket, newsBucket);
    }
}
