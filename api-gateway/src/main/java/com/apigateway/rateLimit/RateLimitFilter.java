package com.apigateway.rateLimit;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import org.jspecify.annotations.NonNull;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.Objects;

@Component
@Order(-1)
public class RateLimitFilter implements WebFilter {

    private final GatewayRateLimiter gatewayRateLimiter;

    public RateLimitFilter(GatewayRateLimiter gatewayRateLimiter) {
        this.gatewayRateLimiter = gatewayRateLimiter;
    }

    @Override
    @NonNull
    public Mono<Void> filter(@NonNull ServerWebExchange exchange,
                             @NonNull WebFilterChain chain) {

        String path = exchange.getRequest().getURI().getPath();
        if (path == null || !path.startsWith("/api/")) {
            return chain.filter(exchange);
        }

        if (exchange.getRequest().getMethod() == HttpMethod.OPTIONS) {
            return chain.filter(exchange);
        }

        String clientIp = extractClientIp(exchange);
        String service  = extractService(path);

        Bucket bucket = gatewayRateLimiter.resolveBucket(clientIp, service);

        if (bucket == null) {
            return chain.filter(exchange);
        }

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            exchange.getResponse().getHeaders()
                    .add("X-RateLimit-Remaining",
                            String.valueOf(probe.getRemainingTokens()));
            return chain.filter(exchange);

        } else {
            long waitSeconds = probe.getNanosToWaitForRefill() / 1_000_000_000;

            exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            exchange.getResponse().getHeaders().add("Retry-After", String.valueOf(waitSeconds));
            exchange.getResponse().getHeaders().add("Content-Type", "application/json");

            String body = """
                    {"error": "Too Many Requests", "retryAfterSeconds": %d}
                    """.formatted(waitSeconds);

            return exchange.getResponse().writeWith(
                    Mono.just(exchange.getResponse()
                            .bufferFactory()
                            .wrap(body.getBytes()))
            );
        }
    }

    private String extractClientIp(ServerWebExchange exchange) {
        String forwarded = exchange.getRequest()
                .getHeaders()
                .getFirst("X-Forwarded-For");

        if (forwarded != null && !forwarded.isBlank()) {
            String[] parts = forwarded.split(",");
            if (parts.length > 0) {
                String ip = parts[0].trim();
                if (!ip.isBlank()) return ip;
            }
        }

        return Objects.requireNonNullElse(
                exchange.getRequest().getRemoteAddress() != null
                        ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                        : null,
                "unknown"
        );
    }

    private String extractService(String path) {
        if (path.startsWith("/api/news"))           return "news";

        if (path.startsWith("/api/market"))         return "finance";
        if (path.startsWith("/api/trade"))          return "finance";
        if (path.startsWith("/api/portfolio"))      return "finance";
        if (path.startsWith("/api/admin"))          return "finance";

        return "default";
    }
}
