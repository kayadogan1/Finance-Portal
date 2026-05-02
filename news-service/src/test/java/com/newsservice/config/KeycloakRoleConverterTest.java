package com.newsservice.config;

import com.newsservice.service.UserService;
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

    private final String clientId = "news-client";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(keycloakRoleConverter, "CLIENT_ID", clientId);
    }

    @Test
    void convert_whenValidResourceAccess_returnsTokenWithAuthorities() {
        // Arrange
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn("user-123");
        Map<String, Object> resourceAccess = Map.of(
            clientId, Map.of("roles", List.of("news_admin"))
        );
        when(jwt.getClaim("resource_access")).thenReturn(resourceAccess);

        // Act
        AbstractAuthenticationToken result = keycloakRoleConverter.convert(jwt);

        // Assert
        assertNotNull(result);
        Collection<GrantedAuthority> authorities = result.getAuthorities();
        assertEquals(1, authorities.size());
        assertTrue(authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_news_admin")));
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
        verify(userService).getOrCreateUser(jwt);
    }

    @Test
    void convert_whenClientEntryMissing_returnsTokenWithNoAuthorities() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn("user-456");
        when(jwt.getClaim("resource_access")).thenReturn(Map.of("other-client", Map.of("roles", List.of("user"))));

        AbstractAuthenticationToken result = keycloakRoleConverter.convert(jwt);

        assertNotNull(result);
        assertTrue(result.getAuthorities().isEmpty());
        verify(userService).getOrCreateUser(jwt);
    }

    @Test
    void convert_whenRolesEntryInvalid_returnsTokenWithNoAuthorities() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn("user-789");
        when(jwt.getClaim("resource_access")).thenReturn(Map.of(clientId, Map.of("roles", "admin")));

        AbstractAuthenticationToken result = keycloakRoleConverter.convert(jwt);

        assertNotNull(result);
        assertTrue(result.getAuthorities().isEmpty());
        verify(userService).getOrCreateUser(jwt);
    }
}
