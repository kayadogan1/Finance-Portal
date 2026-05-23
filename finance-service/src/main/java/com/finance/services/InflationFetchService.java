package com.finance.services;

import com.finance.exceptions.YahooFetchException;
import com.finance.models.Inflation;
import com.finance.repositories.InflationRepository;
import com.finance.shared.EvdsInflationResponse;
import com.finance.shared.InflationItem;
import lombok.RequiredArgsConstructor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RequiredArgsConstructor
@Service
public class InflationFetchService {
    private final RestClient restClient;
    private final Logger logger = LogManager.getLogger(InflationFetchService.class);
    private final InflationRepository inflationRepository;
    @Value("${evds.api.key}")
    private String API_KEY ;
    private static final DateTimeFormatter EVDS_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    public List<Inflation> fetchInflationDataFromApi(){
        try {
            String endDate = LocalDate.now().format(EVDS_DATE_FORMATTER);
            EvdsInflationResponse response = restClient.get()
                    .uri("https://evds3.tcmb.gov.tr/igmevdsms-dis/series=TP.FG.J0&startDate=01-05-2010&endDate=" + endDate + "&type=json&frequency=5&formulas=1")
                    .header("key", API_KEY)
                    .retrieve()
                    .body(EvdsInflationResponse.class);
            if(response==null || response.totalCount()==0){
                logger.warn("Inflation api response empty");
                return List.of();
            }
            List<Inflation> inflationList = response.items()
                    .stream()
                    .map(this::toInflationEntity)
                    .toList();
            return saveToDatabase(inflationList);

        }catch (Exception exception){
            logger.error("error occurred while fetching data from TCMB...{}",exception.getMessage());
            throw new YahooFetchException("Run time exception while fetching inflation data..");
        }

    }
    public List<Inflation> getALlInflationRates(){
        return inflationRepository.findAll();
    }
    private Inflation toInflationEntity(InflationItem inflationItem){
        return Inflation.builder()
                .rate(inflationItem.rate())
                .associatedCountry("tr")
                .timestamp(toLocalDate(inflationItem.date()))
                .build();
    }
    private LocalDate toLocalDate(String date){
        String[] parts = date.split("-");
        if (parts[0].length() == 4) {
            return LocalDate.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), 1);
        }
        if (parts.length == 2) {
            return LocalDate.of(Integer.parseInt(parts[1]), Integer.parseInt(parts[0]), 1);
        }
        return LocalDate.of(Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), 1);
    }
    private List<Inflation> saveToDatabase(List<Inflation> inflationList){
        logger.info("inflation records saving ....");

        List<Inflation> inflationListToSave = inflationList.stream()
                .filter(inflation -> inflation.getTimestamp() != null && inflation.getRate() != null)
                .map(this::resolveInflationForSave)
                .toList();
        return inflationRepository.saveAll(inflationListToSave);
    }

    private Inflation resolveInflationForSave(Inflation inflation) {
        return inflationRepository.findByTimestamp(inflation.getTimestamp())
                .map(existingInflation -> {
                    existingInflation.setRate(inflation.getRate());
                    existingInflation.setAssociatedCountry(inflation.getAssociatedCountry());
                    return existingInflation;
                })
                .orElse(inflation);
    }

}
