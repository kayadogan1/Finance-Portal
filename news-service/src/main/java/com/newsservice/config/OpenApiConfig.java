package com.newsservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI newsOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Finance Portal News API")
                        .description("Finans haberleri, RSS yenileme ve haber admin akışları için REST API dokümantasyonu.")
                        .version("v1.0")
                        .contact(new Contact()
                                .name("Finance Portal Team")
                                .email("dev@financeportal.local")));
    }
}
