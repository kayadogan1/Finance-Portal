package com.finance.services;

import com.finance.models.User;
import com.finance.repositories.UserRepository;
import com.finance.shared.RiskTolerance;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private Jwt jwt;

    @InjectMocks
    private UserService userService;

    private final String userId = "user123";
    private final String name = "Test Name";
    private final String email = "test@example.com";

    @BeforeEach
    void setUp() {
        when(jwt.getSubject()).thenReturn(userId);
        when(jwt.<String>getClaim("email")).thenReturn(email);
        when(jwt.<String>getClaim("name")).thenReturn(name);
        when(jwt.<RiskTolerance>getClaim("riskTolerance")).thenReturn(RiskTolerance.MODERATE);

        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void getOrCreateUser_whenUserNotFound_createsAndSavesUser() {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // Act
        User result = userService.getOrCreateUser(jwt);

        // Assert
        assertNotNull(result);
        assertEquals(userId, result.getId());
        assertEquals(email, result.getEmail());
        assertEquals(name, result.getName());
        assertEquals(RiskTolerance.MODERATE, result.getRiskTolerance());
        assertFalse(result.isFrozen());
        assertEquals("TRY", result.getPreferredCurrency());

        verify(userRepository).findById(userId);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void getOrCreateUser_whenUserExistsWithDifferentFields_updatesAndSaves() {
        // Arrange
        User existingUser = new User();
        existingUser.setId(userId);
        existingUser.setEmail("old@example.com");
        existingUser.setName("Old Name");
        when(userRepository.findById(userId)).thenReturn(Optional.of(existingUser));

        // Act
        User result = userService.getOrCreateUser(jwt);

        // Assert
        assertEquals(userId, result.getId());
        assertEquals(email, result.getEmail());
        assertEquals(name, result.getName());

        verify(userRepository).findById(userId);
        verify(userRepository).save(existingUser);
    }

    @Test
    void getOrCreateUser_whenUserExistsButOnlyDetailsChanged_updatesAndSaves() {
        // Arrange
        User existingUser = new User();
        existingUser.setId(userId);
        existingUser.setEmail(email);
        existingUser.setName("Old Name");
        when(userRepository.findById(userId)).thenReturn(Optional.of(existingUser));

        // Act
        User result = userService.getOrCreateUser(jwt);

        // Assert
        assertEquals(email, result.getEmail());
        assertEquals(name, result.getName());
        verify(userRepository).save(existingUser);
    }
    
    @Test
    void getOrCreateUser_whenUserExistsWithSameFields_returnsUserWithoutSave() {
        // Arrange
        User existingUser = new User();
        existingUser.setId(userId);
        existingUser.setEmail(email);
        existingUser.setName(name);
        // Note: riskTolerance is not actually checked during updateUser in the source, just email and name.
        when(userRepository.findById(userId)).thenReturn(Optional.of(existingUser));

        // Act
        User result = userService.getOrCreateUser(jwt);

        // Assert
        assertEquals(userId, result.getId());
        assertEquals(email, result.getEmail());
        assertEquals(name, result.getName());

        verify(userRepository).findById(userId);
        verify(userRepository, never()).save(any(User.class));
    }
    
    @Test
    void getOrCreateUser_whenClaimsAreNull_doesNotFailToUpdate() {
        // Arrange
        when(jwt.<String>getClaim("email")).thenReturn(null);
        when(jwt.<String>getClaim("name")).thenReturn(null);
        
        User existingUser = new User();
        existingUser.setId(userId);
        existingUser.setEmail("old@example.com");
        existingUser.setName("Old Name");
        when(userRepository.findById(userId)).thenReturn(Optional.of(existingUser));

        // Act
        User result = userService.getOrCreateUser(jwt);

        // Assert
        assertEquals("old@example.com", result.getEmail());
        assertEquals("Old Name", result.getName());
        verify(userRepository, never()).save(any(User.class));
    }
}