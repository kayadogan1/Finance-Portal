package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import com.finance.repositories.InstrumentRepository;
import com.finance.shared.FetchTask;
import org.springframework.resilience.annotation.Retryable;
import tools.jackson.databind.JsonNode;
import com.finance.shared.Currency;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.Tracer;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.resilience.annotation.ConcurrencyLimit;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;

@Service
public class FetchMarketDataService {

    private final InstrumentPropertiesConfig instrumentProperties;
    private final MarketDataPersistenceService persistenceService;
    private final InstrumentRepository instrumentRepository;
    private final RestClient restClient;
    private final Tracer tracer;
    @Autowired
    @Lazy
    private  FetchMarketDataService self;
    private static final Logger logger = LogManager.getLogger(FetchMarketDataService.class);

    @Value("${finance.YAHOO_API_BASE_URL}")
    private String YAHOO_API_URL;

    public FetchMarketDataService(InstrumentPropertiesConfig instrumentProperties,
                                  MarketDataPersistenceService persistenceService,
                                  RestClient restClient, Tracer tracer, InstrumentRepository instrumentRepository) {
        this.instrumentProperties = instrumentProperties;
        this.persistenceService = persistenceService;
        this.restClient = restClient;
        this.tracer = tracer;
        this.instrumentRepository = instrumentRepository;
    }
    private List<List<FetchTask>> partitionMarketData(){
        List<FetchTask> allTasks = new ArrayList<>();
        instrumentProperties.getStock().forEach((exchange, symbolsMap) -> {
            Currency currency = "BIST".equalsIgnoreCase(exchange) ? Currency.TRY : Currency.USD;
            symbolsMap.keySet().forEach(dbSymbol ->
                    instrumentRepository.findBySymbol(dbSymbol).ifPresent(instrument ->
                            allTasks.add(new FetchTask(dbSymbol, "STOCK", currency))
                    )
            );
        });
        Map.of(
                "FOREX",     instrumentProperties.getForex(),
                "INDEX",     instrumentProperties.getIndex(),
                "COMMODITY", instrumentProperties.getCommodity(),
                "BOND",      instrumentProperties.getBond()
        ).forEach((category, instruments) -> {
            if (instruments != null) {
                instruments.keySet().forEach(dbSymbol ->
                        allTasks.add(new FetchTask(dbSymbol, category, null))
                );
            }
        });
        List<List<FetchTask>> chunks = new ArrayList<>();
        for (int i = 0; i < allTasks.size(); i += 50) {
            chunks.add(allTasks.subList(i, Math.min(i + 50, allTasks.size())));
        }
        return chunks;
    }

    @Observed()
    public void updateAllMarketData() {
        logger.info("Starting GLOBAL market data update from YAHOO FINANCE...");
        List<List<FetchTask>> chunks = partitionMarketData();
        logger.info("Total chunks: {}, tasks: {}",
                chunks.size(),
                chunks.stream().mapToInt(List::size).sum()
        );

        if (!instrumentProperties.getStock().isEmpty()) {
            try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {

                for(List<FetchTask> chunk : chunks){
                    executor.submit(tracer.currentTraceContext().wrap(() -> chunk.forEach(task ->
                            self.fetchAndSave(task.dbSymbol(),task.category(),task.currency()))));
                }
            }
        }

        logger.info("GLOBAL market data update completed.");
    }

    @Observed
    @ConcurrencyLimit(limit = 10)
    @Retryable(
            multiplier = 2.0,
            delay = 2
    )
    public void fetchAndSave(String dbSymbol, String category, Currency  baseCurrency) {
        try {
            String yahooSymbol = convertToYahooFormat(dbSymbol, category, baseCurrency);
            String finalUrl = YAHOO_API_URL.replace("{symbol}", yahooSymbol);

            logger.debug("Fetching {} -> {} URL: {}", dbSymbol, yahooSymbol, finalUrl);

            JsonNode jsonResponse = restClient.get()
                    .uri(finalUrl)
                    .header("User-Agent", "Mozilla/5.0")
                    .retrieve()
                    .body(JsonNode.class);

            BigDecimal price = parseYahooPrice(jsonResponse);

            if (price != null) {
                persistenceService.saveMarketData(dbSymbol, price);
            } else {
                logger.error("Price not found for {} (Yahoo: {})", dbSymbol, yahooSymbol);
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

    public BigDecimal parseYahooPrice(JsonNode root) {
        try {
            JsonNode result = root.path("chart").path("result");

            if (result.isMissingNode() || !result.isArray() || result.isEmpty()) {
                logger.warn("Yahoo response has no result array");
                return null;
            }

            JsonNode meta = result.get(0).path("meta");

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
        if (symbol != null && symbol.startsWith("X")) {
            return symbol + ".IS";
        }
        return switch (symbol) {
            case "SPX" -> "^GSPC";
            case "DJI" -> "^DJI";
            case "NDX" -> "^NDX";
            case "DAX" -> "^GDAXI";
            case "UK100" -> "^FTSE";
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
