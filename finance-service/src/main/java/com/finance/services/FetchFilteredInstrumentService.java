package com.finance.services;

import com.finance.mapper.ChartResponseToModel;
import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.repositories.MarketDataRepository;
import com.finance.shared.YahooChartResponse;
import lombok.RequiredArgsConstructor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.*;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FetchFilteredInstrumentService {

    private static final Logger logger =
            LogManager.getLogger(FetchFilteredInstrumentService.class);

    private static final long MIN_FETCH_INTERVAL_SECONDS = 900;

    private final MarketDataRepository marketDataRepository;
    private final FetchMarketDataService fetchMarketDataService;
    private final RestClient restClient;

    @Value("${finance.YAHOO_API_URL}")
    private String yahooApiUrl;

    @Transactional
    public void fetchInstrumentClosePricesSinceLastDate(Instrument instrument) {

        Instant lastTimestamp = marketDataRepository
                .findFirstByInstrumentOrderByTimestampDesc(instrument)
                .map(MarketData::getTimestamp)
                .map(ldt -> ldt.toInstant(ZoneOffset.UTC))
                .orElse(null);

        List<MarketData> fetchedData = fetchFromYahoo(instrument, lastTimestamp);

        if (fetchedData.isEmpty()) {
            logger.info("No new data found for {}", instrument.getSymbol());
            return;
        }

        marketDataRepository.saveAll(fetchedData);
        logger.info("Saved {} new records for {}", fetchedData.size(), instrument.getSymbol());
    }

    private List<MarketData> fetchFromYahoo(Instrument instrument, Instant lastTimestamp) {

        String symbol = fetchMarketDataService.convertToYahooFormat(
                instrument.getSymbol(),
                instrument.getType().name(),
                instrument.getBaseCurrency()
        );

        long period2 = LocalDate.now(ZoneOffset.UTC)
                .atStartOfDay(ZoneOffset.UTC)
                .toEpochSecond();

        long period1;
        if (lastTimestamp != null) {
            period1 = lastTimestamp.getEpochSecond();

            if ((period2 - period1) < MIN_FETCH_INTERVAL_SECONDS) {
                logger.info("Skipping Yahoo fetch for {}, data is already up to date.", symbol);
                return Collections.emptyList();
            }
        } else {
            period1 = Instant.now()
                    .atZone(ZoneOffset.UTC)
                    .minusYears(10)
                    .toEpochSecond() + 1;
        }

        String url = yahooApiUrl
                .replace("{symbol}", symbol)
                .replace("{period1}", String.valueOf(period1))
                .replace("{period2}", String.valueOf(period2));

        return executeYahooRequest(url, instrument);
    }

    private List<MarketData> executeYahooRequest(String url,
                                                 Instrument instrument) {
        try {
            YahooChartResponse response = restClient.get()
                    .uri(url)
                    .header("User-Agent", "Mozilla/5.0")
                    .retrieve()
                    .body(YahooChartResponse.class);

            validateResponse(response);

            return ChartResponseToModel.toMarketDataList(response, instrument);

        } catch (Exception ex) {
            logger.error("Yahoo fetch failed for {}", instrument.getSymbol(), ex);
            throw new RestClientException("Yahoo fetch failed", ex);
        }
    }

    private void validateResponse(YahooChartResponse response) {
        if (response == null ||
                response.chart() == null ||
                response.chart().result() == null ||
                response.chart().result().isEmpty()) {

            throw new IllegalStateException("Invalid Yahoo API response");
        }
    }
}