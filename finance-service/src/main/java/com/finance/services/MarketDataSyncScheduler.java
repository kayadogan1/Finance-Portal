package com.finance.services;

import com.finance.models.Instrument;
import com.finance.repositories.InstrumentRepository;
import lombok.RequiredArgsConstructor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MarketDataSyncScheduler {

    private final InstrumentRepository instrumentRepository;
    private final FetchFilteredInstrumentService fetchFilteredInstrumentService;
    private final Logger logger = LogManager.getLogger(this.getClass());
    @Scheduled(cron = "0 10 15 * * MON-FRI", zone = "Europe/Istanbul")
    public void syncAllInstrumentsDaily() {
        logger.info("Starting daily market data sync job...");
        List<Instrument> instruments = instrumentRepository.findAll();

        for (Instrument instrument : instruments) {
            try {
                fetchFilteredInstrumentService.fetchInstrumentClosePricesSinceLastDate(instrument);
                Thread.sleep(200);
            } catch (Exception e) {
                logger.error("Failed to sync data for {}: {}", instrument.getSymbol(), e.getMessage());
            }
        }
        logger.info("Daily market data sync job completed.");
    }
}