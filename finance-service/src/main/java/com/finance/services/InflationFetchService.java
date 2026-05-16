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
import java.util.List;

@RequiredArgsConstructor
@Service
public class InflationFetchService {
    private final RestClient restClient;
    private final Logger logger = LogManager.getLogger(InflationFetchService.class);
    private final InflationRepository inflationRepository;
    @Value("${evds.api.key}")
    private String API_KEY ;
    public List<Inflation> fetchInflationDataFromApi(){
        try {
            EvdsInflationResponse response = restClient.get()
                    .uri("https://evds3.tcmb.gov.tr/igmevdsms-dis/series=TP.FG.J0&startDate=01-05-2020&endDate=16-05-2026&type=json&frequency=5&formulas=3")
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
            saveToDatabase(inflationList);
            return inflationList;

        }catch (Exception exception){
            logger.error("error occurred while fetching data from TCMB...{}",exception.getMessage());
            throw new YahooFetchException("Run time exception while fetching inflation data..");
        }



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
        return LocalDate.of(Integer.parseInt(parts[0]),Integer.parseInt(parts[1]),1);
    }
    private void saveToDatabase(List<Inflation> inflationList){
        logger.info("inflation records saving ....");
        inflationRepository.saveAll(inflationList);
    }

}
