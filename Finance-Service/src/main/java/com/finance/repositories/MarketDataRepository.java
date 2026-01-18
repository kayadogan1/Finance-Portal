package com.finance.repositories;

import com.finance.models.MarketData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MarketDataRepository extends JpaRepository<MarketData, UUID> {


}
