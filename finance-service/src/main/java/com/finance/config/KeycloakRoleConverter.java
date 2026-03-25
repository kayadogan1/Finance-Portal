package com.finance.config;

import com.finance.services.UserService;
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
@Component
public class KeycloakRoleConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final static Logger logger = LogManager.getLogger(KeycloakRoleConverter.class);
    private final UserService userService;
    @Value("${keycloak.clientId}")
    private  String CLIENT_ID ;

    public KeycloakRoleConverter(UserService userService) {
        this.userService = userService;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {

        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess == null) {
            return new JwtAuthenticationToken(jwt, Collections.emptyList());
        }
        userService.getOrCreateUser(jwt);
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
