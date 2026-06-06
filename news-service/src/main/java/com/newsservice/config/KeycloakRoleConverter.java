package com.newsservice.config;

import com.newsservice.service.UserService;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
/**
 * Class that provides keycloak role converter behavior.
 */
@Component
public class KeycloakRoleConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final static Logger logger = LogManager.getLogger(KeycloakRoleConverter.class);
    private final UserService userService;
    /**
     * Creates a new KeycloakRoleConverter with its required dependencies.
     *
     * @param userService user service value
     */
    public KeycloakRoleConverter(UserService userService) {
        this.userService = userService;
    }
    @Value("${keycloak.clientId}")
    private String CLIENT_ID;

    /**
     * Returns the result of convert.
     *
     * @param jwt jwt value
     * @return convert result
     */
    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {

        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        logger.info("user id passing to method for invoke :{}",jwt.getSubject());
        userService.getOrCreateUser(jwt);
        if (resourceAccess == null) {
            return new JwtAuthenticationToken(jwt, Collections.emptyList());
        }
        logger.info("resource_access: {}", resourceAccess.toString());
        Object clientObj = resourceAccess.get(CLIENT_ID);

        if (!(clientObj instanceof Map<?, ?> clientAccess)) {
            return new JwtAuthenticationToken(jwt, Collections.emptyList());
        }

        Object rolesObj = clientAccess.get("roles");

        if (!(rolesObj instanceof List<?> roles)) {
            return new JwtAuthenticationToken(jwt, Collections.emptyList());
        }

        Collection<GrantedAuthority> authorities =
                roles.stream()
                        .filter(String.class::isInstance)
                        .map(String.class::cast)
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                        .collect(Collectors.toList());
        logger.info("authorities: {}", authorities.toString());

        return new JwtAuthenticationToken(jwt, authorities);
    }
}