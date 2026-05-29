package com.finance.controllers;

import com.finance.handling.ApiResult;
import com.finance.models.Inflation;
import com.finance.services.InflationFetchService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InflationControllerTest {

    @Mock
    private InflationFetchService inflationFetchService;

    @InjectMocks
    private InflationController inflationController;

    @Test
    void fetchInflationRatesFromProvider_returnsFetchedRates() {
        List<Inflation> rates = List.of(inflation(1L, 75.45, LocalDate.of(2026, 5, 1)));
        when(inflationFetchService.fetchInflationDataFromApi()).thenReturn(rates);

        ResponseEntity<ApiResult<List<Inflation>>> response = inflationController.fetchInflationRatesFromProvider();

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().success());
        assertEquals("inflation data fetched", response.getBody().message());
        assertEquals(rates, response.getBody().data());
        verify(inflationFetchService).fetchInflationDataFromApi();
    }

    @Test
    void getAllInflationData_returnsRatesFromDatabase() {
        List<Inflation> rates = List.of(inflation(2L, 68.50, LocalDate.of(2026, 4, 1)));
        when(inflationFetchService.getALlInflationRates()).thenReturn(rates);

        ResponseEntity<ApiResult<List<Inflation>>> response = inflationController.getAllInflationData();

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().success());
        assertEquals("fetching inflation rates is success", response.getBody().message());
        assertEquals(rates, response.getBody().data());
        verify(inflationFetchService).getALlInflationRates();
    }

    private Inflation inflation(Long id, Double rate, LocalDate timestamp) {
        return Inflation.builder()
                .id(id)
                .rate(rate)
                .associatedCountry("tr")
                .timestamp(timestamp)
                .build();
    }
}
