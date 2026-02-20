package com.finance.services;

import com.finance.shared.BinanceResponseDto;
import io.micrometer.observation.annotation.Observed;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

@Service
public class CryptoService {

    private final MarketDataPersistenceService persistenceService;
    private final RestClient restClient;
    private static final Logger logger = LogManager.getLogger(CryptoService.class);

    @Value("${finance.binance.api.base-url}")
    private String CRYPTO_API_URL;

    public CryptoService(RestClient restClient,
                         MarketDataPersistenceService persistenceService) {
        this.restClient = restClient;
        this.persistenceService = persistenceService;
    }
    @Observed
    public void fetchAndStoreCryptoData(String symbol) {
        String binanceSymbol = symbol.toUpperCase();
        if (!binanceSymbol.endsWith("USDT")) {
            binanceSymbol += "USDT";
        }

        logger.info("Fetching crypto data for: {} (Binance Symbol: {})", symbol, binanceSymbol);

        try {
            BinanceResponseDto responseDto = restClient.get()
                    .uri(CRYPTO_API_URL + "/api/v3/ticker/price?symbol={symbol}", binanceSymbol)
                    .retrieve()
                    .body(BinanceResponseDto.class);

            if (responseDto != null) {
                logger.info("Received response: {}", responseDto);
                BigDecimal price = new BigDecimal(responseDto.getPrice());
                persistenceService.saveMarketData(symbol, price);
            }
        } catch (Exception e) {
            logger.error("Error fetching crypto data: {}", e.getMessage());
        }
    }
}