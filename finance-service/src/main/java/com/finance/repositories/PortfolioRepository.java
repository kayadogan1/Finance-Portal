package com.finance.repositories;

import com.finance.models.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, UUID> {

    List<Portfolio> findAllByUserId(String userId);

    Optional<Portfolio> findByIdAndUserId(UUID portfolioId,String userId);



    Boolean existsByIdAndUserId(UUID portfolioId,String userId);
}
