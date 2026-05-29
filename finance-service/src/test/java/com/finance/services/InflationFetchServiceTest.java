package com.finance.services;

import com.finance.exceptions.YahooFetchException;
import com.finance.models.Inflation;
import com.finance.repositories.InflationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(MockitoExtension.class)
class InflationFetchServiceTest {

    @Mock
    private InflationRepository inflationRepository;

    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer server;
    private InflationFetchService inflationFetchService;

    @BeforeEach
    void setUp() {
        restClientBuilder = RestClient.builder();
        server = MockRestServiceServer.bindTo(restClientBuilder).build();
        inflationFetchService = new InflationFetchService(restClientBuilder.build(), inflationRepository);
        ReflectionTestUtils.setField(inflationFetchService, "API_KEY", "test-key");
    }

    @Test
    void fetchInflationDataFromApi_whenResponseHasItems_updatesExistingAndSavesNewRows() {
        Inflation existing = Inflation.builder()
                .id(1L)
                .rate(60.0)
                .associatedCountry("tr")
                .timestamp(LocalDate.of(2026, 5, 1))
                .build();
        when(inflationRepository.findByTimestamp(LocalDate.of(2026, 5, 1))).thenReturn(Optional.of(existing));
        when(inflationRepository.findByTimestamp(LocalDate.of(2026, 4, 1))).thenReturn(Optional.empty());
        when(inflationRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://evds3.tcmb.gov.tr/igmevdsms-dis/series=TP.FG.J0")))
                .andExpect(header("key", "test-key"))
                .andRespond(withSuccess("""
                        {
                          "totalCount": 2,
                          "items": [
                            {"Tarih": "2026-05", "TP.FG.J0": "75,45"},
                            {"Tarih": "01-04-2026", "TP.FG.J0": 68.5},
                            {"Tarih": "03-2026", "TP.FG.J0": null}
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        List<Inflation> result = inflationFetchService.fetchInflationDataFromApi();

        assertEquals(2, result.size());
        assertEquals(75.45, existing.getRate());
        assertEquals(LocalDate.of(2026, 4, 1), result.get(1).getTimestamp());
        assertEquals(68.5, result.get(1).getRate());
        verify(inflationRepository).saveAll(any());
        server.verify();
    }

    @Test
    void fetchInflationDataFromApi_whenResponseIsEmpty_returnsEmptyList() {
        server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://evds3.tcmb.gov.tr/igmevdsms-dis/series=TP.FG.J0")))
                .andRespond(withSuccess("""
                        {"totalCount": 0, "items": []}
                        """, MediaType.APPLICATION_JSON));

        List<Inflation> result = inflationFetchService.fetchInflationDataFromApi();

        assertEquals(List.of(), result);
        server.verify();
    }

    @Test
    void fetchInflationDataFromApi_whenProviderFails_wrapsException() {
        server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://evds3.tcmb.gov.tr/igmevdsms-dis/series=TP.FG.J0")))
                .andRespond(withServerError());

        assertThrows(YahooFetchException.class, () -> inflationFetchService.fetchInflationDataFromApi());
        server.verify();
    }

    @Test
    void getALlInflationRates_returnsRepositoryRows() {
        List<Inflation> rates = List.of(Inflation.builder()
                .id(1L)
                .rate(75.45)
                .associatedCountry("tr")
                .timestamp(LocalDate.of(2026, 5, 1))
                .build());
        when(inflationRepository.findAll()).thenReturn(rates);

        List<Inflation> result = inflationFetchService.getALlInflationRates();

        assertEquals(rates, result);
        verify(inflationRepository).findAll();
    }
}
