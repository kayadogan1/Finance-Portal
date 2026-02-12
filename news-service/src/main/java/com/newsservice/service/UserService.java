package com.newsservice.service;

import com.newsservice.model.User;
import com.newsservice.repository.UserRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final Logger logger= LogManager.getLogger(UserService.class);
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    public  void getOrCreateUser(Jwt jwt){
        String userId = jwt.getSubject();
        logger.info("user id is {} ",userId);
        userRepository.findById(userId)
                .map(existing -> updateUser(existing,jwt))
                .orElseGet(()-> createUser(jwt));
    }
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
