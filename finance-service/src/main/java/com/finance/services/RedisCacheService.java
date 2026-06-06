package com.finance.services;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import java.time.Duration;

/**
 * Service component that handles redis cache operations.
 */
@Service
public class RedisCacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Creates a new RedisCacheService with its required dependencies.
     *
     * @param redisTemplate redis template value
     */
    public RedisCacheService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Saves value.
     *
     * @param key key value
     * @param value value value
     */
    public void save(String key, Object value) {
        redisTemplate.opsForValue().set(key, value, Duration.ofMinutes(10));
    }

    /**
     * Returns value.
     *
     * @param key key value
     * @param targetClass target class value
     * @return value result
     */
    public <T> T get(String key, Class<T> targetClass) {
        Object data = redisTemplate.opsForValue().get(key);
        if (data != null) {
            try {
                return targetClass.cast(data);
            } catch (ClassCastException e) {
                return null;
            }
        }
        return null;
    }
}