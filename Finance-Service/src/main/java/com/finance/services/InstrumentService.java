package com.finance.services;

import com.finance.models.Instrument;
import com.finance.repositories.InstrumentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class InstrumentService {

    private final InstrumentRepository instrumentRepository;
    public InstrumentService(InstrumentRepository instrumentRepository) {
        this.instrumentRepository = instrumentRepository;
    }

    public List<Instrument> getAllInstruments() {
        return instrumentRepository.findAll();
    }

    public Optional<Instrument> getInstrumentBySymbol(String symbol) {
        return instrumentRepository.findInstrumentBySymbol(symbol);
    }


}
