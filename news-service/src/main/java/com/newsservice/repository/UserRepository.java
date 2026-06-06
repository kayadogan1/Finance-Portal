package com.newsservice.repository;

import com.newsservice.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data repository for user persistence operations.
 */
@Repository
public interface UserRepository extends JpaRepository<User,String> {
    /**
     * Finds by username.
     *
     * @param username username value
     * @return matching by username result
     */
    Optional<User> findByUsername(String username);
    /**
     * Finds by email.
     *
     * @param email email value
     * @return matching by email result
     */
    Optional<User> findByEmail(String email);

}
