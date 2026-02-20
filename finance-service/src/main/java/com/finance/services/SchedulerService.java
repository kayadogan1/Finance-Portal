package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import io.micrometer.tracing.Tracer;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.concurrent.Executors;

@Service
public class SchedulerService {
    private final FetchMarketDataService yahooService;
    private final CryptoService cryptoService;
    private final InstrumentPropertiesConfig config;
    private final Tracer tracer;
    private final Logger logger = LogManager.getLogger(SchedulerService.class);
    public SchedulerService(FetchMarketDataService yahooService, CryptoService cryptoService,Tracer tracer ,InstrumentPropertiesConfig config) {
        this.yahooService = yahooService;
        this.cryptoService = cryptoService;
        this.config = config;
        this.tracer = tracer;
    }
    @Scheduled(fixedRate = 200000)
    public void updateGeneralMarkets() {
        logger.info("Updating general market data (stocks, forex, indices) from Yahoo...");
        yahooService.updateAllMarketData();
    }

    @Scheduled(fixedRate = 500000)
    public void updateBinanceCryptoData() {

        if (config.getCrypto().isEmpty()) {
            logger.info("No cryptocurrencies configured for update.");
            return;
        }
        logger.info("Updating cryptocurrency data from Binance...");
        try(var executor = Executors.newVirtualThreadPerTaskExecutor()){
           config.getCrypto().keySet().forEach(key -> executor.submit(tracer.currentTraceContext().wrap(() -> cryptoService.fetchAndStoreCryptoData(key))));
        }
        logger.info("Binance crypto data completed.");
    }
}