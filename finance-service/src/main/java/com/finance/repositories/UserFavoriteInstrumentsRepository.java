package com.finance.repositories;

import com.finance.models.UserFavoriteInstruments;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Spring Data repository for user favorite instruments persistence operations.
 */
public interface UserFavoriteInstrumentsRepository extends JpaRepository<UserFavoriteInstruments, Long> {


    /**
     * Finds by user id.
     *
     * @param userId identifier of the user
     * @return matching by user id result
     */
    List<UserFavoriteInstruments> findByUserId(Long userId);



}
