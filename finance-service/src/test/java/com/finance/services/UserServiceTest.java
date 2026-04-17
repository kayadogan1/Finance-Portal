package com.finance.services;

import com.finance.models.User;
import com.finance.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private Jwt jwt;

    @InjectMocks
    private UserService userService;

    @BeforeEach
    void setUp() {
        when(jwt.getSubject()).thenReturn("user-123");
        when(jwt.getClaim("email")).thenReturn("test@email.com");
        when(jwt.getClaim("name")).thenReturn("test user");
    }

    @Test
    void getOrCreateUser_whenUserDoesNotExist_createsAndReturnsNewUser() {
        // ARRANGE
        when(userRepository.findById("user-123"))
                .thenReturn(Optional.empty());
        when(userRepository.save(any(User.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // ACT
        User result = userService.getOrCreateUser(jwt);

        // ASSERT
        assertNotNull(result);
        assertEquals("user-123",       result.getId());
        assertEquals("test@email.com", result.getEmail());
        assertEquals("test user",      result.getName());
        assertEquals("TRY",            result.getPreferredCurrency());
        assertFalse(result.isFrozen());

        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void getOrCreateUser_whenUserExistsAndGmailChanged_updatesAndSaveUser(){
        User existingUser = User.builder()
                .id("user-123")
                .email("eski@gmail.com")
                .name("test user")
                .build();
        when(userRepository.findById("user-123")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.getOrCreateUser(jwt);

        assertEquals("test@email.com", result.getEmail());
        verify(userRepository, times(1)).save(any(User.class));

    }

    @Test
    void getOrCreateUser_whenUserExistsAndNameChanged_updatesAndSaveUser(){
        User existingUser = User.builder()
                .id("user-123")
                .email("test@email.com")
                .name("eski isim")
                .build();
        when(userRepository.findById("user-123")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.getOrCreateUser(jwt);

        assertEquals("test user", result.getName());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void getOrCreateUser_whenNothingChanged_doesNotSave(){
        User existingUser = User.builder()
                .id("user-123")
                .email("test@email.com")
                .name("test user")
                .build();
        when(userRepository.findById("user-123")).thenReturn(Optional.of(existingUser));

        User result = userService.getOrCreateUser(jwt);

        assertEquals(existingUser, result);
        verify(userRepository, never()).save(any());
        verifyNoMoreInteractions(userRepository);


    }
}