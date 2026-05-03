package com.finance.controllers;

import com.finance.handling.ApiResult;
import com.finance.repositories.UserRepository;
import com.finance.services.AdminService;
import com.finance.services.InstrumentService;
import com.finance.shared.InstrumentActiveRequest;
import com.finance.shared.InstrumentDto;
import com.finance.shared.ProviderStatusResponseDto;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("api/admin")
@AllArgsConstructor
public class AdminController {


    private final UserRepository userRepository;
    private final InstrumentService instrumentService;
    private final AdminService adminService;

    @GetMapping("/totalMember")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResult<Integer>>  getTotalUserCount(){
        return ResponseEntity.ok(ApiResult.success(Math.toIntExact(userRepository.count()),"users count calculated",200));
    }

    @GetMapping("/nonactiveInstruments")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResult<List<InstrumentDto>>> getNonactiveInstruments(){
        return ResponseEntity.ok(ApiResult.success(
                instrumentService.getInactiveInstruments(),
                "inactive instruments fetched",
                200
        ));
    }

    @PatchMapping("/instruments/{symbol}/active")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResult<InstrumentDto>> updateInstrumentActiveStatus(
            @PathVariable String symbol,
            @RequestBody InstrumentActiveRequest request
    ) {
        return ResponseEntity.ok(ApiResult.success(
                instrumentService.updateInstrumentActiveStatus(symbol, request.active()),
                "instrument active status updated",
                200
        ));
    }

    @GetMapping("/providers/status")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResult<ProviderStatusResponseDto>> getProviderStatuses() {
        return ResponseEntity.ok(ApiResult.success(
                adminService.getProviderStatuses(),
                "finance provider statuses fetched",
                200
        ));
    }


}
