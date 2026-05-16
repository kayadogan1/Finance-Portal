package com.finance.controllers;

import com.finance.handling.ApiResult;
import com.finance.models.Inflation;
import com.finance.services.InflationFetchService;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("api/inflation")
@RequiredArgsConstructor
public class InflationController {
    private final InflationFetchService inflationFetchService;
    private final Logger logger = LogManager.getLogger(InflationController.class);
    @GetMapping("/get-inflations")
    public ResponseEntity<ApiResult<List<Inflation>>> fetchInflationRatesFromProvider(){
        logger.info("Request to pull inflation rates received");
        return ResponseEntity.ok(ApiResult.success(inflationFetchService.fetchInflationDataFromApi(),
                "inflation data fetched",
                200));
    }

}
