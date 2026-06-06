package com.finance.services;

import com.finance.shared.ProviderStatusDto;
import com.finance.shared.ProviderStatusResponseDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service component that handles admin operations.
 */
@Service
public class AdminService {

    @Value("${finance.binance.api.base-url:}")
    private String binanceApiBaseUrl;

    @Value("${finance.YAHOO_API_URL:}")
    private String yahooApiUrl;

    @Value("${finance.FINTABLES.API_URL:}")
    private String fintablesApiUrl;

    /**
     * Returns provider statuses.
     *
     * @return provider statuses result
     */
    public ProviderStatusResponseDto getProviderStatuses() {
        return new ProviderStatusResponseDto(
                "finance-service",
                List.of(
                        buildStatus(
                                "finance-yahoo",
                                "Yahoo Finance",
                                yahooApiUrl,
                                "Tarihsel fiyat ve endeks verileri icin tanimli."
                        ),
                        buildStatus(
                                "finance-binance",
                                "Binance",
                                binanceApiBaseUrl,
                                "Kripto fiyat akisi icin tanimli."
                        ),
                        buildStatus(
                                "finance-fintables",
                                "Fintables",
                                fintablesApiUrl,
                                "Fon ve TR piyasa veri akisi icin tanimli."
                        )
                )
        );
    }

    /**
     * Returns the result of build status.
     *
     * @param key key value
     * @param label label value
     * @param configuredValue configured value value
     * @param configuredDetail configured detail value
     * @return build status result
     */
    private ProviderStatusDto buildStatus(String key, String label, String configuredValue, String configuredDetail) {
        if (configuredValue == null || configuredValue.isBlank()) {
            return new ProviderStatusDto(
                    key,
                    label,
                    "warning",
                    "Provider konfigurasyonu eksik."
            );
        }

        return new ProviderStatusDto(
                key,
                label,
                "ready",
                configuredDetail
        );
    }
}
