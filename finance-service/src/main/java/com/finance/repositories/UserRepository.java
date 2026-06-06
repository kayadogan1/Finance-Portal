package com.finance.repositories;

import com.finance.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


/**
 * Spring Data repository for user persistence operations.
 */
@Repository
public interface UserRepository extends JpaRepository<User, String> {
}
