package com.finance.services;

import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import com.finance.shared.BinanceResponseDto;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class CryptoService {

    private final InstrumentRepository instrumentRepository;
    private final MarketDataRepository marketDataRepository;
    private static final Logger logger= LogManager.getLogger(CryptoService.class);
    private final RestClient restClient;
    @Value("${finance.binance.api.base-url}")
    private  String CRYPTO_API_URL;
    public CryptoService(RestClient restClient, InstrumentRepository instrumentRepository, MarketDataRepository marketDataRepository) {
        this.marketDataRepository = marketDataRepository;
        this.instrumentRepository = instrumentRepository;
        this.restClient = restClient;
    }
    public void fetchAndStoreCryptoData(String symbol) {
        String binanceSymbol = symbol.toUpperCase();
        if (!binanceSymbol.endsWith("USDT")) {
            binanceSymbol += "USDT";
        }
        logger.info("Fetching crypto data for: {} (Binance Symbol: {})", symbol, binanceSymbol);
        try {
            BinanceResponseDto responseDto = restClient.get()
                    .uri(CRYPTO_API_URL + "/api/v3/ticker/price?symbol={symbol}" , binanceSymbol)
                    .retrieve()
                    .body(BinanceResponseDto.class);
            if(responseDto != null){
                logger.info("Received response: {}" , responseDto);
                saveToDatabase(symbol,responseDto);
            }
        }catch (Exception e){
            logger.error("Error fetching crypto data:{} " , e.getMessage());
        }
    }
    @Transactional
    public void saveToDatabase(String symbol, BinanceResponseDto responseDto){
        var updatedInstrument = instrumentRepository.findInstrumentBySymbol(symbol);
        if(updatedInstrument.isPresent()){
            var oldInstrument = updatedInstrument.get();
            try {
                var marketData = MarketData.builder()
                        .instrument(oldInstrument)
                        .price(new BigDecimal(responseDto.getPrice()))
                        .timestamp(LocalDateTime.now())
                        .build();
                updatedInstrument.get().setCurrentPrice(new BigDecimal(responseDto.getPrice()));
                instrumentRepository.save(updatedInstrument.get());
                marketDataRepository.save(marketData);
                logger.info("Saved market data and updated instrument for symbol:{} price:{} " ,symbol, responseDto.getPrice());
            } catch (Exception e) {
                logger.error("Market data not found for symbol: {}. Error: {}", symbol, e.getMessage(), e);
            }
        }
    }

}
