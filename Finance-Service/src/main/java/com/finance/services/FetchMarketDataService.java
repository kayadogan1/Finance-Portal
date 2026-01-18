package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import com.finance.shared.StockMarketDto;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class FetchMarketDataService {
    private final  InstrumentRepository instrumentRepository;
    private final InstrumentPropertiesConfig instrumentProperties;
    private final MarketDataRepository marketDataRepository;
    @Value("${finance.massive.api.base-url}")
    private  String API_URL;
    @Value("${finance.massive.api.key}")
    private String API_KEY;
    private final static Logger logger = LogManager.getLogger(FetchMarketDataService.class);
    private final RestClient restClient;
    public FetchMarketDataService(InstrumentRepository instrumentRepository,MarketDataRepository marketDataRepository  ,RestClient restClient, InstrumentPropertiesConfig instrumentProperties) {
        this.instrumentProperties = instrumentProperties;
        this.marketDataRepository = marketDataRepository;
        this.restClient = restClient;
        this.instrumentRepository = instrumentRepository;
    }
    public void updateMarketData(){
        logger.info("Starting market data update from Massive API at URL: {}", API_URL);
        instrumentProperties.getStock().keySet().forEach(symbol -> {
            try {
                String url = API_URL + "/marketdata/" + symbol + "?apikey=" + API_KEY;
                logger.info("Fetching market data for symbol: {} from URL: {}", symbol, url);
                ResponseEntity<StockMarketDto> response =restClient.get()
                        .uri(url)
                        .retrieve()
                        .toEntity(StockMarketDto.class);
                logger.info("Received response for symbol {}: {} {}", symbol, response.getBody(),response.getStatusCode());
                if(response.getStatusCode().is2xxSuccessful() && response.getBody() != null){
                    StockMarketDto marketData = response.getBody();
                    saveToDatabase(marketData.getSymbol(),marketData);
                    logger.info("Market data for symbol {} updated successfully.", symbol);
                } else {
                    logger.warn("Failed to fetch market data for symbol {}. Status Code: {}", symbol, response.getStatusCode());
                }

            } catch (Exception e) {
                logger.error("Unexpected Error fetching market data for symbol {}: {}", symbol, e.getMessage());
            }
        });
        logger.info("Market data update process completed.");
    }
    public void saveToDatabase(String symbol, StockMarketDto marketData){
        var updatedInstrument = instrumentRepository.findInstrumentBySymbol(symbol);
        if(updatedInstrument.isPresent()){
            var oldInstrument = updatedInstrument.get();
            updatedInstrument.get().setCurrentPrice(marketData.getLatestPrice());
            instrumentRepository.save(updatedInstrument.get());
            var marketDataEntry = MarketData.builder()
                    .instrument(oldInstrument)
                    .price(marketData.getLatestPrice())
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
            marketDataRepository.save(marketDataEntry);
            logger.info("Saved market data and updated instrument for symbol: {} with price: {}", symbol, marketData.getLatestPrice());
        } else {
            logger.warn("Instrument not found for symbol: {}", symbol);
        }
    }

}
