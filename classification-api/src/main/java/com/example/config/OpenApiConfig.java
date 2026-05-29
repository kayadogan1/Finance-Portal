package com.example.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI classificationOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Finance Portal Classification API")
                        .description("Finans haberlerini varlık tipi ve enstrüman sembolüyle eşleştiren sınıflandırma servisi API dokümantasyonu.")
                        .version("v1.0")
                        .contact(new Contact()
                                .name("Finance Portal Team")
                                .email("dev@financeportal.local")));
    }
}
