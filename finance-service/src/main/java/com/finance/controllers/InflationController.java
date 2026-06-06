package com.finance.controllers;

import com.finance.handling.ApiResult;
import com.finance.models.Inflation;
import com.finance.services.InflationFetchService;
import lombok.RequiredArgsConstructor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for inflation operations.
 */
@RestController
@RequestMapping("api/inflation")
@RequiredArgsConstructor
public class InflationController {
    private final InflationFetchService inflationFetchService;
    private final Logger logger = LogManager.getLogger(InflationController.class);
    /**
     * Handles read requests for fetch inflation rates from provider.
     *
     * @return fetch inflation rates from provider result
     */
    @GetMapping("/get-inflations")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResult<List<Inflation>>> fetchInflationRatesFromProvider(){
        logger.info("Request to pull inflation rates received");
        return ResponseEntity.ok(ApiResult.success(inflationFetchService.fetchInflationDataFromApi(),
                "inflation data fetched",
                200));
    }
    /**
     * Handles read requests for get all inflation data.
     *
     * @return all inflation data result
     */
    @GetMapping("/get-rates")
    public ResponseEntity<ApiResult<List<Inflation>>> getAllInflationData(){
        logger.info("fetching all inflation data from db ... ");
        return ResponseEntity.ok(ApiResult.success(inflationFetchService.getALlInflationRates(),
                "fetching inflation rates is success",
                200));

    }

}
