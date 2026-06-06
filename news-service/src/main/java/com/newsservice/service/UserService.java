package com.newsservice.service;

import com.newsservice.model.User;
import com.newsservice.repository.UserRepository;
import io.micrometer.observation.annotation.Observed;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * Service component that handles user operations.
 */
@Service
@Transactional
@Observed
public class UserService {

    private final UserRepository userRepository;
    private final Logger logger= LogManager.getLogger(UserService.class);
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
     */
    public  void getOrCreateUser(Jwt jwt){
        String userId = jwt.getSubject();
        logger.info("user id is {} ",userId);
        userRepository.findById(userId)
                .map(existing -> updateUser(existing,jwt))
                .orElseGet(()-> createUser(jwt));
    }
    /**
     * Updates user.
     *
     * @param user user value
     * @param jwt jwt value
     * @return update user result
     */
    public User updateUser(User user, Jwt jwt) {
        String name = jwt.getClaimAsString("name");
        String userName = jwt.getClaimAsString("preferred_username");
        String email = jwt.getClaimAsString("email");

        if (!Objects.equals(name, user.getName()) ||
                !Objects.equals(email, user.getEmail()) || !Objects.equals(userName,user.getEmail())) {

            user.setName(name);
            user.setEmail(email);
            logger.info("user updating : {}" , user.getId());
            return userRepository.save(user);
        }
        return user;
    }

    /**
     * Creates user.
     *
     * @param jwt jwt value
     * @return create user result
     */
    public User createUser(Jwt jwt) {
        logger.info("user creating : {}" ,jwt.getSubject());

        User user = User.builder()
                .id(jwt.getSubject())
                .name(jwt.getClaimAsString("name"))
                .email(jwt.getClaimAsString("email"))
                .username(jwt.getClaimAsString("preferred_username"))
                .build();

        return userRepository.save(user);
    }

}
