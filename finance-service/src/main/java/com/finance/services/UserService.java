package com.finance.services;


import com.finance.models.User;
import com.finance.repositories.UserRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service component that handles user operations.
 */
@Service
@Transactional
public class UserService {
    private final UserRepository userRepository;
    private final static Logger logger = LogManager.getLogger(UserService.class);
    /**
     * Creates a new UserService with its required dependencies.
     *
     * @param userRepository user repository value
     */
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    /**
     * Returns or create user.
     *
     * @param jwt jwt value
     * @return or create user result
     */
    public User getOrCreateUser(Jwt jwt){
        String userId = jwt.getSubject();
        logger.info("user id: {}",userId);
        return userRepository.findById(userId)
                .map(existingUser-> updateUser(existingUser,jwt))
                .orElseGet(()-> createUser(jwt));
    }
    /**
     * Creates user.
     *
     * @param jwt jwt value
     * @return create user result
     */
    private User createUser(Jwt jwt){
         User user=  User.builder()
                .id(jwt.getSubject())
                .email(jwt.getClaim("email"))
                .name(jwt.getClaim("name"))
                .riskTolerance(jwt.getClaim("riskTolerance"))
                .preferredCurrency("TRY")
                .isFrozen(false)
                .build();
        return userRepository.save(user);
    }
    /**
     * Updates user.
     *
     * @param user user value
     * @param jwt jwt value
     * @return update user result
     */
    private User updateUser(User user, Jwt jwt){
        String email = jwt.getClaim("email");
        String name = jwt.getClaim("name");
        boolean changed = false;
        if (email != null && !email.equals(user.getEmail())) {
            user.setEmail(email);
            changed = true;
        }
        if (name != null && !name.equals(user.getName())) {
            user.setName(name);
            changed = true;
        }
        if (changed) {
            return userRepository.save(user);
        }
        return user;
    }
}
