package com.finance.controllers;

import com.finance.handling.ApiResult;
import com.finance.repositories.UserRepository;
import com.finance.services.AdminService;
import com.finance.services.InstrumentService;
import com.finance.shared.Currency;
import com.finance.shared.InstrumentActiveRequest;
import com.finance.shared.InstrumentDto;
import com.finance.shared.InstrumentType;
import com.finance.shared.ProviderStatusDto;
import com.finance.shared.ProviderStatusResponseDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private InstrumentService instrumentService;

    @Mock
    private AdminService adminService;

    @InjectMocks
    private AdminController adminController;

    @Test
    void getTotalUserCount_returnsRepositoryCount() {
        when(userRepository.count()).thenReturn(42L);

        ResponseEntity<ApiResult<Integer>> response = adminController.getTotalUserCount();

        assertEquals(200, response.getStatusCode().value());
        assertEquals(42, response.getBody().data());
        assertTrue(response.getBody().success());
        verify(userRepository).count();
    }

    @Test
    void getNonactiveInstruments_returnsInactiveList() {
        List<InstrumentDto> inactiveInstruments = List.of(sampleInstrument("BIST100", false));
        when(instrumentService.getInactiveInstruments()).thenReturn(inactiveInstruments);

        ResponseEntity<ApiResult<List<InstrumentDto>>> response = adminController.getNonactiveInstruments();

        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().data().size());
        assertEquals("BIST100", response.getBody().data().getFirst().getSymbol());
        verify(instrumentService).getInactiveInstruments();
    }

    @Test
    void updateInstrumentActiveStatus_updatesViaService() {
        InstrumentDto updatedInstrument = sampleInstrument("BIST100", true);
        when(instrumentService.updateInstrumentActiveStatus("BIST100", true)).thenReturn(updatedInstrument);

        ResponseEntity<ApiResult<InstrumentDto>> response = adminController.updateInstrumentActiveStatus(
                "BIST100",
                new InstrumentActiveRequest(true)
        );

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().data().isActive());
        assertEquals("BIST100", response.getBody().data().getSymbol());
        verify(instrumentService).updateInstrumentActiveStatus("BIST100", true);
    }

    @Test
    void getProviderStatuses_returnsAdminStatusPayload() {
        ProviderStatusResponseDto providerStatuses = new ProviderStatusResponseDto(
                "finance-service",
                List.of(new ProviderStatusDto("finance-yahoo", "Yahoo Finance", "ready", "Configured"))
        );
        when(adminService.getProviderStatuses()).thenReturn(providerStatuses);

        ResponseEntity<ApiResult<ProviderStatusResponseDto>> response = adminController.getProviderStatuses();

        assertEquals(200, response.getStatusCode().value());
        assertEquals("finance-service", response.getBody().data().service());
        assertEquals(1, response.getBody().data().providers().size());
        verify(adminService).getProviderStatuses();
    }

    private InstrumentDto sampleInstrument(String symbol, boolean active) {
        return new InstrumentDto(
                symbol,
                "Sample Instrument",
                InstrumentType.INDEX,
                new BigDecimal("1000"),
                new BigDecimal("950"),
                Currency.TRY,
                "TR BORSA",
                LocalDateTime.now(),
                active,
                true
        );
    }
}
