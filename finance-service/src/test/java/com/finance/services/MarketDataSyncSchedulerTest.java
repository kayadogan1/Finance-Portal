package com.finance.services;

import com.finance.models.Instrument;
import com.finance.repositories.InstrumentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketDataSyncSchedulerTest {

    @Mock
    private InstrumentRepository instrumentRepository;

    @Mock
    private FetchFilteredInstrumentService fetchFilteredInstrumentService;

    @InjectMocks
    private MarketDataSyncScheduler marketDataSyncScheduler;

    @Test
    void syncAllInstrumentsDaily_whenInstrumentsExist_fetchesAll() {
        Instrument aapl = new Instrument();
        aapl.setSymbol("AAPL");
        Instrument msft = new Instrument();
        msft.setSymbol("MSFT");
        when(instrumentRepository.findAll()).thenReturn(List.of(aapl, msft));

        marketDataSyncScheduler.syncAllInstrumentsDaily();

        verify(fetchFilteredInstrumentService).fetchInstrumentClosePricesSinceLastDate(aapl);
        verify(fetchFilteredInstrumentService).fetchInstrumentClosePricesSinceLastDate(msft);
    }

    @Test
    void syncAllInstrumentsDaily_whenThreadInterrupted_breaksWithoutFetching() {
        Instrument aapl = new Instrument();
        aapl.setSymbol("AAPL");
        when(instrumentRepository.findAll()).thenReturn(List.of(aapl));

        Thread.currentThread().interrupt();
        try {
            marketDataSyncScheduler.syncAllInstrumentsDaily();
        } finally {
            Thread.interrupted();
        }

        verify(fetchFilteredInstrumentService, never()).fetchInstrumentClosePricesSinceLastDate(any());
    }
}
