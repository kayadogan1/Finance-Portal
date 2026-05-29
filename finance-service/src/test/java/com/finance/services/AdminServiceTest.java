package com.finance.services;

import com.finance.shared.ProviderStatusResponseDto;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AdminServiceTest {

    @Test
    void getProviderStatuses_whenProviderUrlsAreConfigured_marksProvidersReady() {
        AdminService adminService = new AdminService();
        ReflectionTestUtils.setField(adminService, "yahooApiUrl", "https://query1.finance.yahoo.com");
        ReflectionTestUtils.setField(adminService, "binanceApiBaseUrl", "https://api.binance.com");
        ReflectionTestUtils.setField(adminService, "fintablesApiUrl", "https://api.fintables.com");

        ProviderStatusResponseDto response = adminService.getProviderStatuses();

        assertEquals("finance-service", response.service());
        assertEquals(3, response.providers().size());
        assertTrue(response.providers().stream().allMatch(provider -> "ready".equals(provider.state())));
    }

    @Test
    void getProviderStatuses_whenProviderUrlsAreBlank_marksProvidersWarning() {
        AdminService adminService = new AdminService();
        ReflectionTestUtils.setField(adminService, "yahooApiUrl", " ");
        ReflectionTestUtils.setField(adminService, "binanceApiBaseUrl", null);
        ReflectionTestUtils.setField(adminService, "fintablesApiUrl", "");

        ProviderStatusResponseDto response = adminService.getProviderStatuses();

        assertEquals(3, response.providers().size());
        assertTrue(response.providers().stream().allMatch(provider -> "warning".equals(provider.state())));
        assertTrue(response.providers().stream().allMatch(provider -> "Provider konfigurasyonu eksik.".equals(provider.detail())));
    }
}
