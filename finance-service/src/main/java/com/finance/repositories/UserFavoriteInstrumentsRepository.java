package com.finance.repositories;

import com.finance.models.UserFavoriteInstruments;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserFavoriteInstrumentsRepository extends JpaRepository<UserFavoriteInstruments, Long> {


    List<UserFavoriteInstruments> findByUserId(Long userId);



}
