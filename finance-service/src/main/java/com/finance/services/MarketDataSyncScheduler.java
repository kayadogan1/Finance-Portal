package com.finance.services;

import com.finance.models.Instrument;
import com.finance.repositories.InstrumentRepository;
import lombok.RequiredArgsConstructor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;

/**
 * Service component that handles market data sync scheduler operations.
 */
@Service
@RequiredArgsConstructor
public class MarketDataSyncScheduler {

    private final InstrumentRepository instrumentRepository;
    private final FetchFilteredInstrumentService fetchFilteredInstrumentService;
    private static final int MAX_CONCURRENT = 20;
    private final Logger logger = LogManager.getLogger(this.getClass());
    /**
     * Performs sync all instruments daily.
     */
    @Scheduled(cron = "0 10 20 * * MON-FRI", zone = "Europe/Istanbul")
    public void syncAllInstrumentsDaily() {
        logger.info("Starting daily market data sync job...");

        List<Instrument> instruments = instrumentRepository.findAll();
        Semaphore semaphore = new Semaphore(MAX_CONCURRENT);

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {

            for (Instrument instrument : instruments) {
                try {
                    semaphore.acquire();

                    executor.submit(() -> {
                        try {
                            fetchFilteredInstrumentService
                                    .fetchInstrumentClosePricesSinceLastDate(instrument);

                        } catch (Exception e) {
                            logger.error(
                                    "Failed to sync {}: {}",
                                    instrument.getSymbol(),
                                    e.getMessage(),
                                    e
                            );

                        } finally {
                            semaphore.release();
                        }
                    });

                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    logger.error("Market data sync job interrupted", e);
                    break;
                }
            }

        }

        logger.info("Daily market data sync job completed.");
    }
}