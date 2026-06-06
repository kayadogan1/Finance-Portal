package com.finance.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring configuration for open api.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Returns the result of finance open api.
     *
     * @return finance open api result
     */
    @Bean
    public OpenAPI financeOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Finance Portfolio API")
                        .description("Spring Boot 4 ile güçlendirilmiş Borsa API")
                        .version("v2.0")
                        .contact(new Contact()
                                .name("Lead Developer")
                                .email("dev@finance.com")));
    }
}
