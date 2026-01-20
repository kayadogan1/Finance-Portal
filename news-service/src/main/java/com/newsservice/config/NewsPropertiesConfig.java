package com.newsservice.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

@Configuration
@Getter
@Setter
@PropertySource(value = "classpath:news.properties", encoding = "UTF-8")
@ConfigurationProperties(prefix = "news.rss")
public class NewsPropertiesConfig {

    private String url;
}
