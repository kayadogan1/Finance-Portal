package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Service
public class FetchMarketDataService {

    private final InstrumentRepository instrumentRepository;
    private final InstrumentPropertiesConfig instrumentProperties;
    private final MarketDataRepository marketDataRepository;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    private final static Logger logger = LogManager.getLogger(FetchMarketDataService.class);

    @Value("${finance.YAHOO_API_URL}")
    private String YAHOO_API_URL;

    public FetchMarketDataService(InstrumentRepository instrumentRepository,
                                  MarketDataRepository marketDataRepository,
                                  RestClient restClient,
                                  InstrumentPropertiesConfig instrumentProperties) {
        this.instrumentProperties = instrumentProperties;
        this.marketDataRepository = marketDataRepository;
        this.restClient = restClient;
        this.instrumentRepository = instrumentRepository;
        this.objectMapper = new ObjectMapper();
    }

    public void updateAllMarketData() {
        logger.info("Starting GLOBAL market data update from YAHOO FINANCE...");

        updateStocks(instrumentProperties.getStock());

        updateCategory(instrumentProperties.getForex(), "FOREX");
        updateCategory(instrumentProperties.getIndex(), "INDEX");
        updateCategory(instrumentProperties.getCommodity(), "COMMODITY");
        updateCategory(instrumentProperties.getBond(), "BOND");
        updateCategory(instrumentProperties.getFiat(), "FIAT");

        logger.info("GLOBAL market data update completed.");
    }


    private void updateStocks(Map<String, Map<String, String>> stockInstruments) {
        if (stockInstruments == null || stockInstruments.isEmpty()) return;

        stockInstruments.forEach((exchange, symbolsMap) -> symbolsMap.keySet().forEach(dbSymbol -> fetchAndSave(dbSymbol, "STOCK", exchange)));
    }

    private void updateCategory(Map<String, String> instruments, String categoryName) {
        if (instruments == null || instruments.isEmpty()) return;

        instruments.keySet().forEach(dbSymbol -> fetchAndSave(dbSymbol, categoryName, null));
    }

    private void fetchAndSave(String dbSymbol, String category, String exchangeContext) {
        try {
            String yahooSymbol = convertToYahooFormat(dbSymbol, category, exchangeContext);

            String finalUrl = YAHOO_API_URL.replace("{symbol}", yahooSymbol);
            logger.debug("Fetching {} -> {} URL: {}", dbSymbol, yahooSymbol, finalUrl);

            String jsonResponse = restClient.get()
                    .uri(finalUrl)
                    .header("User-Agent", "Mozilla/5.0")
                    .retrieve()
                    .body(String.class);

            BigDecimal price = parseYahooPrice(jsonResponse);

            if (price != null) {
                saveToDatabase(dbSymbol, price);
            } else {
                logger.warn("Price not found for {} (Yahoo: {})", dbSymbol, yahooSymbol);
            }


        } catch (Exception e) {
            logger.error("Error updating symbol {}: {}", dbSymbol, e.getMessage());
        }
    }


    private String convertToYahooFormat(String dbSymbol, String category, String exchangeContext) {
        return switch (category) {
            case "FOREX" -> dbSymbol + "=X";
            case "CRYPTO" -> dbSymbol + "-USD";
            case "STOCK" -> {
                if ("BIST".equalsIgnoreCase(exchangeContext)) {
                    yield dbSymbol + ".IS";
                }
                yield dbSymbol;
            }
            case "COMMODITY" -> getCommodityCode(dbSymbol);
            case "INDEX" -> getIndexCode(dbSymbol);
            case "BOND" -> getBondCode(dbSymbol);
            case "FIAT" -> {
                if (dbSymbol.equals("USD")) yield "DX-Y.NYB";
                if (dbSymbol.equals("TRY")) yield "USDTRY=X";
                yield dbSymbol + "USD=X";
            }
            default -> dbSymbol;
        };
    }

    private BigDecimal parseYahooPrice(String jsonResponse) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode meta = root.path("chart").path("result").get(0).path("meta");

            if (meta.has("regularMarketPrice")) {
                return meta.get("regularMarketPrice").decimalValue();
            }
        } catch (Exception e) {
            logger.error("JSON Parse Error: {}", e.getMessage());
        }
        return null;
    }


    private String getCommodityCode(String symbol) {
        return switch (symbol) {
            case "GOLD" -> "GC=F";
            case "SILVER" -> "SI=F";
            case "OIL" -> "CL=F";
            case "BRENT" -> "BZ=F";
            case "NATGAS" -> "NG=F";
            case "COPPER" -> "HG=F";
            case "PLATINUM" -> "PL=F";
            case "PALLADIUM" -> "PA=F";
            case "CORN" -> "ZC=F";
            case "WHEAT" -> "ZW=F";
            case "SOYBEAN" -> "ZS=F";
            case "COFFEE" -> "KC=F";
            case "SUGAR" -> "SB=F";
            case "COTTON" -> "CT=F";
            default -> symbol + "=F";
        };
    }

    private String getIndexCode(String symbol) {
        return switch (symbol) {
            case "SPX" -> "^GSPC";
            case "DJI" -> "^DJI";
            case "NDX" -> "^NDX";
            case "DAX" -> "^GDAXI";
            case "UK100" -> "^FTSE";
            case "XU100" -> "XU100.IS";
            case "XU030" -> "XU030.IS";
            case "N225" -> "^N225";
            case "CAC40" -> "^FCHI";
            case "HSI" -> "^HSI";
            case "VIX" -> "^VIX";
            default -> symbol;
        };
    }

    private String getBondCode(String symbol) {
        return switch (symbol) {
            case "US10Y" -> "^TNX";
            case "US30Y" -> "^TYX";
            case "US02Y" -> "^IRX";
            default -> symbol;
        };
    }
    public void saveToDatabase(String symbol, BigDecimal price) {
        var updatedInstrument = instrumentRepository.findInstrumentBySymbol(symbol);
        if (updatedInstrument.isPresent()) {
            var instrument = updatedInstrument.get();
            instrument.setCurrentPrice(price);
            instrument.setLastUpdateTime(LocalDateTime.now());
            instrumentRepository.save(instrument);

            var marketDataEntry = MarketData.builder()
                    .instrument(instrument)
                    .price(price)
                    .timestamp(LocalDateTime.now())
                    .build();
            marketDataRepository.save(marketDataEntry);
            logger.info("Updated {}: {}", symbol, price);
        } else {
            logger.warn("Instrument not found in DB: {}", symbol);
        }
    }
}