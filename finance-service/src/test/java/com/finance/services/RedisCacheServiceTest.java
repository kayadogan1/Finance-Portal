package com.finance.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RedisCacheServiceTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @InjectMocks
    private RedisCacheService redisCacheService;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void save_whenCalled_storesValueInRedisWithTimeout() {
        // Arrange
        String key = "testKey";
        String value = "testValue";

        // Act
        redisCacheService.save(key, value);

        // Assert
        verify(redisTemplate).opsForValue();
        verify(valueOperations).set(eq(key), eq(value), eq(Duration.ofMinutes(10)));
    }

    @Test
    void get_whenValueExistsAndTypeMatches_returnsCastValue() {
        // Arrange
        String key = "testKey";
        String value = "testValue";
        when(valueOperations.get(key)).thenReturn(value);

        // Act
        String result = redisCacheService.get(key, String.class);

        // Assert
        assertEquals(value, result);
        verify(valueOperations).get(key);
    }

    @Test
    void get_whenValueDoesNotExist_returnsNull() {
        // Arrange
        String key = "testKey";
        when(valueOperations.get(key)).thenReturn(null);

        // Act
        String result = redisCacheService.get(key, String.class);

        // Assert
        assertNull(result);
        verify(valueOperations).get(key);
    }

    @Test
    void get_whenValueExistsButTypeMismatches_returnsNullAndCatchesClassCastException() {
        // Arrange
        String key = "testKey";
        Integer mismatchValue = 123; // Trying to cast Integer to String
        when(valueOperations.get(key)).thenReturn(mismatchValue);

        // Act
        String result = redisCacheService.get(key, String.class);

        // Assert
        assertNull(result); // due to catch (ClassCastException e) returning null
        verify(valueOperations).get(key);
    }
}
