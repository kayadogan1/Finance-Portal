package com.finance.services;

import com.finance.exceptions.NotFoundException;
import com.finance.models.Inflation;
import com.finance.repositories.InflationRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class InflationService {

    private final Logger logger = LogManager.getLogger(InflationService.class);
    private final InflationRepository inflationRepository ;


    public InflationService(InflationRepository inflationRepository) {
        this.inflationRepository = inflationRepository;
    }

    public List<Inflation> getAllInflationRates(){
        return inflationRepository.findAll();
    }

    public Inflation getInflationRateByDate(LocalDate date){
        return inflationRepository.findByTimestamp(date)
                .orElseThrow(() -> new NotFoundException("inflation not found"));
    }



}
