package com.apigateway.rateLimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RateLimitFilterTest {

    private TrackingGatewayRateLimiter gatewayRateLimiter;
    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        gatewayRateLimiter = new TrackingGatewayRateLimiter();
        filter = new RateLimitFilter(gatewayRateLimiter);
    }

    @Test
    void filter_whenPathIsNotApi_skipsRateLimiter() {
        ServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/public/health").build()
        );
        AtomicBoolean chainCalled = new AtomicBoolean(false);

        filter.filter(exchange, chain(chainCalled)).block();

        assertTrue(chainCalled.get());
        assertTrue(gatewayRateLimiter.calls.isEmpty());
    }

    @Test
    void filter_whenRequestIsOptions_skipsRateLimiter() {
        ServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.method(HttpMethod.OPTIONS, "/api/market").build()
        );
        AtomicBoolean chainCalled = new AtomicBoolean(false);

        filter.filter(exchange, chain(chainCalled)).block();

        assertTrue(chainCalled.get());
        assertTrue(gatewayRateLimiter.calls.isEmpty());
    }

    @Test
    void filter_whenBucketAllowsRequest_addsRemainingHeaderAndContinues() {
        Bucket bucket = bucketWithCapacity(2);
        gatewayRateLimiter.stub("203.0.113.10", "finance", bucket);
        ServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/market/prices")
                        .header("X-Forwarded-For", "203.0.113.10, 10.0.0.2")
                        .build()
        );
        AtomicBoolean chainCalled = new AtomicBoolean(false);

        filter.filter(exchange, chain(chainCalled)).block();

        assertTrue(chainCalled.get());
        assertEquals("1", exchange.getResponse().getHeaders().getFirst("X-RateLimit-Remaining"));
        assertEquals(1, gatewayRateLimiter.calls.get("203.0.113.10:finance"));
    }

    @Test
    void filter_whenBucketIsExhausted_returnsTooManyRequests() {
        Bucket bucket = bucketWithCapacity(1);
        bucket.tryConsume(1);
        gatewayRateLimiter.stub("198.51.100.7", "news", bucket);
        ServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/news/latest")
                        .remoteAddress(new InetSocketAddress("198.51.100.7", 5150))
                        .build()
        );
        AtomicBoolean chainCalled = new AtomicBoolean(false);

        filter.filter(exchange, chain(chainCalled)).block();

        assertFalse(chainCalled.get());
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, exchange.getResponse().getStatusCode());
        assertEquals("application/json", exchange.getResponse().getHeaders().getFirst("Content-Type"));
        assertEquals(1, gatewayRateLimiter.calls.get("198.51.100.7:news"));
    }

    private Bucket bucketWithCapacity(long capacity) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacity)
                        .refillGreedy(capacity, Duration.ofHours(1))
                        .build())
                .build();
    }

    private WebFilterChain chain(AtomicBoolean chainCalled) {
        return exchange -> {
            chainCalled.set(true);
            return Mono.empty();
        };
    }

    private static class TrackingGatewayRateLimiter extends GatewayRateLimiter {
        private final Map<String, Bucket> buckets = new HashMap<>();
        private final Map<String, Integer> calls = new HashMap<>();

        void stub(String clientIp, String service, Bucket bucket) {
            buckets.put(key(clientIp, service), bucket);
        }

        @Override
        public Bucket resolveBucket(String clientIp, String service) {
            String key = key(clientIp, service);
            calls.merge(key, 1, Integer::sum);
            return buckets.get(key);
        }

        private String key(String clientIp, String service) {
            return clientIp + ":" + service;
        }
    }
}
