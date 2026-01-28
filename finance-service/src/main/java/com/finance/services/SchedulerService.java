package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class SchedulerService {
    private final FetchMarketDataService polygonService;
    private final CryptoService cryptoService;
    private final InstrumentPropertiesConfig config;
    private final Logger logger = LogManager.getLogger(SchedulerService.class);
    public SchedulerService(FetchMarketDataService polygonService, CryptoService cryptoService, InstrumentPropertiesConfig config) {
        this.polygonService = polygonService;
        this.cryptoService = cryptoService;
        this.config = config;
    }

    @Scheduled(fixedRate = 200000)
    public void updateGeneralMarkets() {
        logger.info("Updating general market data (stocks, forex, indices) from Polygon...");
        polygonService.updateAllMarketData();
    }

    @Scheduled(fixedRate = 500000)
    public void updateBinanceCryptoData() {
        if (config.getCrypto().isEmpty()) {
            logger.info("No cryptocurrencies configured for update.");
            return;
        }
        logger.info("Updating cryptocurrency data from Binance...");
        config.getCrypto().keySet().forEach(cryptoService::fetchAndStoreCryptoData);
    }
}