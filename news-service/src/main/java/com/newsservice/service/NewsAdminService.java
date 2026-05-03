package com.newsservice.service;

import com.newsservice.dto.ProviderStatusDto;
import com.newsservice.dto.ProviderStatusResponseDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NewsAdminService {

    @Value("${news.api.yahoo.url:}")
    private String yahooRssUrl;

    @Value("${news.api.sozcu.base.url:}")
    private String sozcuRssBaseUrl;

    @Value("${model.service.api.url:}")
    private String modelServiceApiUrl;

    public ProviderStatusResponseDto getProviderStatuses() {
        return new ProviderStatusResponseDto(
                "news-service",
                List.of(
                        buildStatus(
                                "news-yahoo-rss",
                                "Yahoo RSS",
                                yahooRssUrl,
                                "ABD finans haber akisi icin tanimli."
                        ),
                        buildStatus(
                                "news-sozcu-rss",
                                "Sozcu RSS",
                                sozcuRssBaseUrl,
                                "TR finans ve piyasa haber akisi icin tanimli."
                        ),
                        buildStatus(
                                "news-classification-api",
                                "Classification API",
                                modelServiceApiUrl,
                                "Haber siniflandirma servisi tanimli."
                        )
                )
        );
    }

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
