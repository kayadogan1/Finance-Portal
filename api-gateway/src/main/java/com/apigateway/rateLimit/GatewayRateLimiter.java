package com.apigateway.rateLimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GatewayRateLimiter {

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public Bucket resolveBucket(@NonNull String clientIp, @NonNull String service) {
        String key = clientIp + ":" + service;
        return buckets.computeIfAbsent(key, k -> buildBucket(service));
    }

    private Bucket buildBucket(@NonNull String service) {
        return switch (service) {

            case "finance" -> Bucket.builder()
                    .addLimit(Bandwidth.builder()
                            .capacity(20)
                            .refillGreedy(20, Duration.ofMinutes(1))
                            .build())
                    .addLimit(Bandwidth.builder()
                            .capacity(5)
                            .refillIntervally(5, Duration.ofSeconds(10))
                            .build())
                    .build();

            case "news" -> Bucket.builder()
                    .addLimit(Bandwidth.builder()
                            .capacity(100)
                            .refillGreedy(100, Duration.ofMinutes(1))
                            .build())
                    .build();

            default -> Bucket.builder()
                    .addLimit(Bandwidth.builder()
                            .capacity(30)
                            .refillGreedy(30, Duration.ofMinutes(1))
                            .build())
                    .build();
        };
    }
}