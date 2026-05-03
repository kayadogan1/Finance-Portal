package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import com.finance.models.Instrument;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import com.finance.shared.Currency;
import com.finance.shared.FundHistoryResponse;
import com.finance.shared.InstrumentType;
import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

@Service
public class FundScraperService {
    private final Logger logger = LogManager.getLogger(FundScraperService.class);
    private final Map<String, String> funds;
    private final Map<String, String> viops;
    private final MarketDataPersistenceService marketDataPersistenceService;
    private final InstrumentRepository instrumentRepository;
    private final MarketDataRepository marketDataRepository;
    private final RestClient restClient;
    private final Tracer tracer;

    @Value("${finance.FINTABLES.API_URL}")
    private String API_URL;

    private static final int MAX_CONCURRENT_REQUESTS = 5;
    private static final int DELAY_BETWEEN_REQUESTS_MS = 200;

    public FundScraperService(MarketDataPersistenceService marketDataPersistenceService,
                              RestClient restClient,
                              InstrumentPropertiesConfig instrumentPropertiesConfig, MarketDataRepository marketDataRepository, InstrumentRepository instrumentRepository, Tracer tracer) {
        this.restClient = restClient;
        this.marketDataRepository = marketDataRepository;
        this.marketDataPersistenceService = marketDataPersistenceService;
        this.instrumentRepository = instrumentRepository;
        this.funds = instrumentPropertiesConfig.getFund();
        this.viops = instrumentPropertiesConfig.getViop();
        this.tracer = tracer;
    }

    @Scheduled(cron = "0 44 19 * * *", zone = "Europe/Istanbul")
    public void scrapeFunds() {
        logger.info("Starting one-time scrape for Funds and VIOPs...");
        Span parentSpan = tracer.nextSpan()
                .name("fund-scraper-job")
                .tag("funds.count", String.valueOf(funds.size()))
                .tag("viops.count", String.valueOf(viops.size()))
                .start();
        try (Tracer.SpanInScope scope = tracer.withSpan(parentSpan)) {

            try (ExecutorService executorService = Executors.newVirtualThreadPerTaskExecutor()) {
                Semaphore rateLimitSemaphore = new Semaphore(MAX_CONCURRENT_REQUESTS);

                funds.keySet().forEach(key -> submitTask(executorService, rateLimitSemaphore, key, parentSpan));
                viops.keySet().forEach(key -> submitTask(executorService, rateLimitSemaphore, key, parentSpan));

            } catch (Exception e) {
                parentSpan.error(e);
                logger.error("Error during data scraping process", e);
            }

        }
        finally {
            parentSpan.end();
        }
        logger.info("All scraping tasks completed.");
    }

    private void submitTask(ExecutorService executor, Semaphore semaphore, String instrumentName, Span parentSpan) {
        executor.submit(tracer.currentTraceContext().wrap(() -> {
            Span childSpan = tracer.nextSpan(parentSpan)
                    .name("scrape-symbol")
                    .tag("symbol", instrumentName)
                    .tag("instrument.type", resolveInstrumentKind(instrumentName))
                    .start();
            boolean permitAcquired = false;
            try (Tracer.SpanInScope ignored = tracer.withSpan(childSpan)) {
                semaphore.acquire();
                permitAcquired = true;
                fetchAndProcess(instrumentName);
                TimeUnit.MILLISECONDS.sleep(DELAY_BETWEEN_REQUESTS_MS);
            } catch (InterruptedException e) {
                childSpan.error(e);
                Thread.currentThread().interrupt();
                logger.error("Task interrupted for instrument: {}", instrumentName);
            } catch (Exception e) {
                childSpan.error(e);
                logger.error("Unhandled scrape task error for instrument: {}", instrumentName, e);
            } finally {
                if (permitAcquired) {
                    semaphore.release();
                }
                childSpan.end();
            }
        }));
    }

    private String resolveInstrumentKind(String instrumentName) {
        if (funds.containsKey(instrumentName)) {
            return "fund";
        }
        if (viops.containsKey(instrumentName)) {
            return "viop";
        }
        return "unknown";
    }
    private Instrument firstSaveToDatabase(String instrumentName) {

        String name;
        InstrumentType type;

        if (funds.containsKey(instrumentName)) {
            name = funds.get(instrumentName);
            type = InstrumentType.FUND;
        } else if (viops.containsKey(instrumentName)) {
            name = viops.get(instrumentName);
            type = InstrumentType.VIOP;
        } else {
            throw new IllegalArgumentException("Instrument config içinde bulunamadı: " + instrumentName);
        }

        Instrument instrument = Instrument.builder()
                .symbol(instrumentName)
                .name(name)
                .type(type)
                .baseCurrency(Currency.TRY)
                .currentPrice(null)
                .previousPrice(null)
                .lastUpdateTime(LocalDateTime.now())
                .isActive(true)
                .historicalDataLoaded(false)
                .build();

        return instrumentRepository.save(instrument);
    }
    private void fetchAndProcess(String instrumentName) {
        logger.info("Fetching data for instrument: {}", instrumentName);

        try {
            var instrument = instrumentRepository.findInstrumentBySymbol(instrumentName)
                    .orElseGet(() -> {
                        logger.warn("Instrument not found in DB. Creating first: {}", instrumentName);
                        return firstSaveToDatabase(instrumentName);
                    });

            long fromUnix = marketDataRepository.findFirstByInstrumentOrderByTimestampDesc(instrument)
                    .map(md -> md.getTimestamp().plusDays(1).atZone(ZoneId.of("Europe/Istanbul")).toEpochSecond())
                    .orElseGet(() -> LocalDate.now().minusYears(2).atStartOfDay(ZoneId.of("Europe/Istanbul")).toEpochSecond());

            long toUnix = LocalDate.now().plusDays(1).atStartOfDay(ZoneId.of("Europe/Istanbul")).toEpochSecond();

            if (fromUnix >= toUnix) {
                logger.info("Data for {} is already strictly up to date. Skipping API call.", instrumentName);
                return;
            }
            String apiSymbol = instrumentName.contains(".")?
                    instrumentName.substring(instrumentName.lastIndexOf(".")+1) :
                    instrumentName.replace("F_","");
            FundHistoryResponse response = restClient.get()
                    .uri(API_URL + "?symbol={symbol}&resolution=D&from={from}&to={to}", apiSymbol, fromUnix, toUnix)
                    .header("Accept", "application/json")
                    .retrieve()
                    .body(FundHistoryResponse.class);

            if (response != null && "ok".equalsIgnoreCase(response.status())) {
                if (response.timestamps() != null && !response.timestamps().isEmpty()) {
                    marketDataPersistenceService.saveHistoricalDataBatch(instrumentName, response.closes(), response.timestamps());
                    logger.info("Successfully fetched and inserted new records for: {}", instrumentName);
                } else {
                    logger.info("API returned 'ok' but no new data arrays for: {}", instrumentName);
                }
            } else {
                logger.error("Invalid response or no data for: {}", instrumentName);
            }
        } catch (Exception e) {
            logger.error("HTTP error for {}: {}", instrumentName, e.getMessage());
        }
    }

}
