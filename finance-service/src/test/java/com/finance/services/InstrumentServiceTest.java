package com.finance.services;

import com.finance.exceptions.InstrumentNotFoundException;
import com.finance.models.Instrument;
import com.finance.repositories.InstrumentRepository;
import com.finance.shared.InstrumentDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InstrumentServiceTest {

    @Mock
    private InstrumentRepository instrumentRepository;

    @Mock
    private RedisCacheService redisCacheService;

    @InjectMocks
    private InstrumentService instrumentService;

    @Test
    void getAllInstruments_withValidPageAndSize_returnsPagedDtos() {
        // Arrange
        Instrument instrument = new Instrument();
        instrument.setSymbol("AAPL");
        instrument.setName("Apple Inc.");
        // instrument type might be enum or string, assuming it has a getter doing nothing special
        instrument.setCurrentPrice(new BigDecimal("150.0"));
        
        Page<Instrument> pageResult = new PageImpl<>(List.of(instrument));
        when(instrumentRepository.findAll(any(Pageable.class))).thenReturn(pageResult);

        // Act
        Page<InstrumentDto> result = instrumentService.getAllInstruments(0, 10);

        // Assert
        assertEquals(1, result.getTotalElements());
        assertEquals("AAPL", result.getContent().get(0).getSymbol());
        assertEquals("Apple Inc.", result.getContent().get(0).getName());
        verify(instrumentRepository).findAll(any(Pageable.class));
    }

    @Test
    void getInstrumentBySymbol_whenInCache_returnsFromCacheWithoutDbCall() {
        // Arrange
        String symbol = "AAPL";
        Instrument cachedInstrument = new Instrument();
        cachedInstrument.setSymbol(symbol);
        when(redisCacheService.get(symbol, Instrument.class)).thenReturn(cachedInstrument);

        // Act
        Instrument result = instrumentService.getInstrumentBySymbol(symbol);

        // Assert
        assertNotNull(result);
        assertEquals(symbol, result.getSymbol());
        verify(redisCacheService).get(symbol, Instrument.class);
        verify(instrumentRepository, never()).findInstrumentBySymbol(anyString());
    }

    @Test
    void getInstrumentBySymbol_whenNotInCacheButInDb_returnsFromDbAndSavesToCache() {
        // Arrange
        String symbol = "AAPL";
        Instrument dbInstrument = new Instrument();
        dbInstrument.setSymbol(symbol);
        
        when(redisCacheService.get(symbol, Instrument.class)).thenReturn(null);
        when(instrumentRepository.findInstrumentBySymbol(symbol)).thenReturn(Optional.of(dbInstrument));

        // Act
        Instrument result = instrumentService.getInstrumentBySymbol(symbol);

        // Assert
        assertNotNull(result);
        assertEquals(symbol, result.getSymbol());
        verify(redisCacheService).get(symbol, Instrument.class);
        verify(instrumentRepository).findInstrumentBySymbol(symbol);
        verify(redisCacheService).save(symbol, dbInstrument);
    }

    @Test
    void getInstrumentBySymbol_whenNotInCacheAndNotInDb_throwsException() {
        // Arrange
        String symbol = "UNKNOWN";
        when(redisCacheService.get(symbol, Instrument.class)).thenReturn(null);
        when(instrumentRepository.findInstrumentBySymbol(symbol)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(InstrumentNotFoundException.class, () -> 
            instrumentService.getInstrumentBySymbol(symbol)
        );
        verify(redisCacheService).get(symbol, Instrument.class);
        verify(instrumentRepository).findInstrumentBySymbol(symbol);
        verify(redisCacheService, never()).save(anyString(), any());
    }
}
