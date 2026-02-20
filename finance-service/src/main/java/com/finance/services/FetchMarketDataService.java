package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.shared.Currency;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.Tracer;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.Executors;

@Service
public class FetchMarketDataService {

    private final InstrumentPropertiesConfig instrumentProperties;
    private final MarketDataPersistenceService persistenceService;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final Tracer tracer;
    @Autowired
    @Lazy
    private  FetchMarketDataService self;
    private static final Logger logger = LogManager.getLogger(FetchMarketDataService.class);

    @Value("${finance.YAHOO_API_URL}")
    private String YAHOO_API_URL;

    public FetchMarketDataService(InstrumentPropertiesConfig instrumentProperties,
                                  MarketDataPersistenceService persistenceService,
                                  RestClient restClient,Tracer tracer) {
        this.instrumentProperties = instrumentProperties;
        this.persistenceService = persistenceService;
        this.restClient = restClient;
        this.tracer = tracer;
        this.objectMapper = new ObjectMapper();
    }
    @Observed()
    public void updateAllMarketData() {
        logger.info("Starting GLOBAL market data update from YAHOO FINANCE...");
        if (!instrumentProperties.getStock().isEmpty()) {
            try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {

                instrumentProperties.getStock().forEach((exchange, symbolsMap) -> {
                        Currency currency = "BIST".equalsIgnoreCase(exchange) ? Currency.TRY : Currency.USD;
                        symbolsMap.keySet().forEach(dbSymbol ->
                                executor.submit(tracer.currentTraceContext().wrap(() ->self.fetchAndSave(dbSymbol, "STOCK", currency)))
                        );
                });


                Map.of(
                        "FOREX",     instrumentProperties.getForex(),
                        "INDEX",     instrumentProperties.getIndex(),
                        "COMMODITY", instrumentProperties.getCommodity(),
                        "BOND",      instrumentProperties.getBond(),
                        "FIAT",      instrumentProperties.getFiat()
                ).forEach((category, instruments) -> {
                    if (instruments != null) {
                        instruments.keySet().forEach(dbSymbol ->
                                executor.submit(tracer.currentTraceContext().wrap(() -> self.fetchAndSave(dbSymbol, category, null)))
                        );
                    }
                });

            }
        }

        logger.info("GLOBAL market data update completed.");
    }




    @Observed
    public void fetchAndSave(String dbSymbol, String category, Currency  baseCurrency) {
        try {
            String yahooSymbol = convertToYahooFormat(dbSymbol, category, baseCurrency);
            String finalUrl = YAHOO_API_URL.replace("{symbol}", yahooSymbol);

            logger.debug("Fetching {} -> {} URL: {}", dbSymbol, yahooSymbol, finalUrl);

            String jsonResponse = restClient.get()
                    .uri(finalUrl)
                    .header("User-Agent", "Mozilla/5.0")
                    .retrieve()
                    .body(String.class);

            BigDecimal price = parseYahooPrice(jsonResponse);

            if (price != null) {
                persistenceService.saveMarketData(dbSymbol, price);
            } else {
                logger.warn("Price not found for {} (Yahoo: {})", dbSymbol, yahooSymbol);
            }

        } catch (Exception e) {
            logger.error("Error updating symbol {}: {}", dbSymbol, e.getMessage());
        }
    }

    public String convertToYahooFormat(String dbSymbol, String category, Currency currency) {
        return switch (category) {
            case "FOREX" -> dbSymbol + "=X";
            case "CRYPTO" -> dbSymbol + "-USD";
            case "STOCK" -> {
                if ( currency!=null && currency.equals(Currency.TRY)) {
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

    public BigDecimal parseYahooPrice(String jsonResponse) {
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

    public String getCommodityCode(String symbol) {
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

    public String getIndexCode(String symbol) {
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

    public String getBondCode(String symbol) {
        return switch (symbol) {
            case "US10Y" -> "^TNX";
            case "US30Y" -> "^TYX";
            case "US02Y" -> "^IRX";
            default -> symbol;
        };
    }
}