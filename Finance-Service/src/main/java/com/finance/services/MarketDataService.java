package com.finance.services;

import com.finance.models.Instrument;
import com.finance.repositories.InstrumentRepository;
import com.finance.shared.InstrumentType;
import jakarta.annotation.PostConstruct;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class MarketDataService {
    private final InstrumentRepository instrumentRepository;
    @Value("${instruments.stocks}")
    private Map<String,String> stocks;
    @Value("${instruments.forex}")
    private Map<String,String> forex;
    @Value("${instruments.crypto}")
    private Map<String,String> crypto;


    private static final Logger logger = LogManager.getLogger(MarketDataService.class);
    public MarketDataService(InstrumentRepository instrumentRepository){
        this.instrumentRepository = instrumentRepository;
    }
    @PostConstruct
    public void initDefaultInstruments(){
        if(instrumentRepository.count()== 0){
            logger.info("database is empty, initializing default instruments");
            logger.info("Loading instruments from properties file..");
            saveInstruments(stocks,InstrumentType.STOCK);
            saveInstruments(forex,InstrumentType.FOREX);
            saveInstruments(crypto,InstrumentType.CRYPTO);
            logger.info("Instruments loaded successfully");

        }
    }

    private void saveInstruments(Map<String,String> instruments, InstrumentType type){
       instruments.forEach((symbol, name )->{
           if(instrumentRepository.findInstrumentBySymbol(symbol).isEmpty()){
               Instrument instrument = Instrument.builder()
                       .symbol(symbol)
                       .name(name)
                       .type(type)
                       .isActive(true)
                       .build();
               instrumentRepository.save(instrument);
               logger.info("saved instrument: {} - {} ",symbol, name);
           }
        });
    }


}
