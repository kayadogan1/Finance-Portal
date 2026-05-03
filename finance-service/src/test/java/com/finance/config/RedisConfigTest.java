package com.finance.config;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import static org.junit.jupiter.api.Assertions.*;

class RedisConfigTest {

    @Test
    void redisTemplate_setsExpectedSerializers() {
        RedisConnectionFactory connectionFactory = Mockito.mock(RedisConnectionFactory.class);

        RedisTemplate<String, Object> template = new RedisConfig().redisTemplate(connectionFactory);

        assertSame(connectionFactory, template.getConnectionFactory());
        assertInstanceOf(StringRedisSerializer.class, template.getKeySerializer());
        assertInstanceOf(StringRedisSerializer.class, template.getHashKeySerializer());
        assertInstanceOf(GenericJacksonJsonRedisSerializer.class, template.getValueSerializer());
        assertInstanceOf(GenericJacksonJsonRedisSerializer.class, template.getHashValueSerializer());
    }
}
