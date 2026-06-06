package com.newsservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring configuration for security.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final KeycloakRoleConverter keycloakRoleConverter;
    /**
     * Creates a new SecurityConfig with its required dependencies.
     *
     * @param keycloakRoleConverter keycloak role converter value
     */
    public SecurityConfig(KeycloakRoleConverter keycloakRoleConverter) {
        this.keycloakRoleConverter = keycloakRoleConverter;
    }
    /**
     * Returns the result of security filter chain.
     *
     * @param http http value
     * @return security filter chain result
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)  {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/v3/api-docs.yaml").permitAll()
                        .requestMatchers("/api/news/admin/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/news/refresh").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/news/refresh").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/news/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/news/**").hasAnyRole("USER", "ADMIN")

                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 ->
                        oauth2.jwt(jwt ->
                                jwt.jwtAuthenticationConverter(keycloakRoleConverter)
                        )
                );

        return http.build();
    }


}
