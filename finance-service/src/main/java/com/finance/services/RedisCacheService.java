package com.finance.services;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import java.time.Duration;

@Service
public class RedisCacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    public RedisCacheService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void save(String key, Object value) {
        redisTemplate.opsForValue().set(key, value, Duration.ofMinutes(10));
    }

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