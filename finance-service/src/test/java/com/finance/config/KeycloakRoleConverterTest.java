package com.finance.config;

import com.finance.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collection;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class KeycloakRoleConverterTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private KeycloakRoleConverter keycloakRoleConverter;

    private final String clientId = "finance-client";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(keycloakRoleConverter, "CLIENT_ID", clientId);
    }

    @Test
    void convert_whenValidResourceAccess_returnsTokenWithAuthorities() {
        // Arrange
        Jwt jwt = mock(Jwt.class);
        Map<String, Object> resourceAccess = Map.of(
            clientId, Map.of("roles", List.of("admin", "user"))
        );
        when(jwt.getClaim("resource_access")).thenReturn(resourceAccess);

        // Act
        AbstractAuthenticationToken result = keycloakRoleConverter.convert(jwt);

        // Assert
        assertNotNull(result);
        Collection<GrantedAuthority> authorities = result.getAuthorities();
        assertEquals(2, authorities.size());
        assertTrue(authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_admin")));
        assertTrue(authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_user")));
        verify(userService).getOrCreateUser(jwt);
    }

    @Test
    void convert_whenResourceAccessMissing_returnsTokenWithNoAuthorities() {
        // Arrange
        Jwt jwt = mock(Jwt.class);
        when(jwt.getClaim("resource_access")).thenReturn(null);

        // Act
        AbstractAuthenticationToken result = keycloakRoleConverter.convert(jwt);

        // Assert
        assertNotNull(result);
        assertTrue(result.getAuthorities().isEmpty());
        verify(userService, never()).getOrCreateUser(any());
    }

    @Test
    void convert_whenClientAccessMissing_returnsTokenWithNoAuthorities() {
        // Arrange
        Jwt jwt = mock(Jwt.class);
        Map<String, Object> resourceAccess = Map.of("other-client", Map.of("roles", List.of("admin")));
        when(jwt.getClaim("resource_access")).thenReturn(resourceAccess);

        // Act
        AbstractAuthenticationToken result = keycloakRoleConverter.convert(jwt);

        // Assert
        assertNotNull(result);
        assertTrue(result.getAuthorities().isEmpty());
    }
}
