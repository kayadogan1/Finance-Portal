package com.finance.repositories;

import com.finance.models.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data repository for portfolio persistence operations.
 */
@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, UUID> {

    /**
     * Finds all by user id.
     *
     * @param userId identifier of the user
     * @return matching all by user id result
     */
    List<Portfolio> findAllByUserId(String userId);

    /**
     * Finds by id and user id.
     *
     * @param portfolioId identifier of the portfolio
     * @param userId identifier of the user
     * @return matching by id and user id result
     */
    Optional<Portfolio> findByIdAndUserId(UUID portfolioId,String userId);



    /**
     * Returns the result of exists by id and user id.
     *
     * @param portfolioId identifier of the portfolio
     * @param userId identifier of the user
     * @return true when exists by id and user id succeeds or matches its condition
     */
    Boolean existsByIdAndUserId(UUID portfolioId,String userId);
}
