package com.finance.config;

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
    public SecurityFilterChain securityFilterChain(HttpSecurity http){

        http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET,"/api/public/**","/api/market/**").permitAll()
                        .requestMatchers(HttpMethod.GET,"/api/inflation/**")
                        .permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()

                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/portfolio/**").hasAnyRole("USER", "ADMIN")

                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt ->jwt.jwtAuthenticationConverter(keycloakRoleConverter)));

        return http.build();
    }
}
