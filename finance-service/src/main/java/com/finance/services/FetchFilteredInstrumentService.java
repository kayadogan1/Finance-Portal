package com.finance.services;

import com.finance.mapper.ChartResponseToModel;
import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.repositories.InstrumentRepository;
import com.finance.repositories.MarketDataRepository;
import com.finance.shared.YahooChartResponse;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FetchFilteredInstrumentService {

    private final MarketDataRepository marketDataRepository;
    private final InstrumentRepository instrumentRepository;
    private final FetchMarketDataService fetchMarketDataService;
    private final RestClient restClient;

    private final Logger logger = LogManager.getLogger(this.getClass());

    @Value("${finance.YAHOO_API_URL}")
    private String YAHOO_API_URL;

    @PostConstruct
    public void init() {
        logger.info("Fetching ten years of instrument data...");

        instrumentRepository.findAll().forEach(instrument -> {
            try {
                if (instrument.isHistoricalDataLoaded()) {
                    logger.info("Historical data already loaded for {}, skipping.", instrument.getSymbol());
                    return;
                }
                List<MarketData> marketDataList = getTenYearsData(instrument);
                saveToDatabase(marketDataList);
                instrument.setHistoricalDataLoaded(true);
                instrumentRepository.save(instrument);
                logger.info("Saved {} records for {}", marketDataList.size(), instrument.getSymbol());
            } catch (Exception e) {
                logger.error("Skipping instrument {}: {}", instrument.getSymbol(), e.getMessage());
            }
        });
    }
    private void saveToDatabase(List<MarketData> marketDataList) {
        logger.info("saving market data to database...");
        marketDataRepository.saveAll(marketDataList);
    }
    public List<MarketData> getTenYearsData(Instrument instrument) {

        String symbolName = fetchMarketDataService.convertToYahooFormat(
                instrument.getSymbol(),
                instrument.getType().name(),
                instrument.getBaseCurrency()
        );

        String finalUrl = YAHOO_API_URL
                .replace("{symbol}", symbolName)
                .replace("range=1d", "range=10y");

        try {

            YahooChartResponse response = restClient.get()
                    .uri(finalUrl)
                    .header("User-Agent", "Mozilla/5.0")
                    .retrieve()
                    .body(YahooChartResponse.class);

            if (response == null ||
                    response.chart() == null ||
                    response.chart().result() == null ||
                    response.chart().result().isEmpty()) {

                throw new IllegalStateException("Invalid Yahoo response");
            }

            return ChartResponseToModel
                    .toMarketDataList(response, instrument);

        } catch (Exception e) {

            logger.error("Error fetching instrument data from Yahoo for {} : {}",
                    instrument.getSymbol(),
                    e.getMessage());

            throw new RestClientException(
                    "Error fetching instrument data from Yahoo", e);
        }
    }
}
