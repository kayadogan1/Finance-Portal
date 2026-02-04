package com.finance.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

import java.util.Map;
@Data
@Configuration
@ConfigurationProperties(prefix = "instruments")
@PropertySource(value = "classpath:instruments.properties", encoding = "UTF-8")
public class InstrumentPropertiesConfig {

    private Map<String,Map<String,String>> stock;
    private Map<String, String> forex;
    private Map<String, String> crypto;
    private Map<String, String> commodity;
    private Map<String, String> index;
    private Map<String, String> bond;
    private Map<String, String> fiat;

}
