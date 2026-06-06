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

/**
 * REST controller for admin operations.
 */
@RestController
@RequestMapping("api/admin")
@AllArgsConstructor
public class AdminController {


    private final UserRepository userRepository;
    private final InstrumentService instrumentService;
    private final AdminService adminService;

    /**
     * Handles read requests for get total user count.
     *
     * @return total user count result
     */
    @GetMapping("/totalMember")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResult<Integer>>  getTotalUserCount(){
        return ResponseEntity.ok(ApiResult.success(Math.toIntExact(userRepository.count()),"users count calculated",200));
    }

    /**
     * Handles read requests for get nonactive instruments.
     *
     * @return nonactive instruments result
     */
    @GetMapping("/nonactiveInstruments")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResult<List<InstrumentDto>>> getNonactiveInstruments(){
        return ResponseEntity.ok(ApiResult.success(
                instrumentService.getInactiveInstruments(),
                "inactive instruments fetched",
                200
        ));
    }

    /**
     * Handles update requests for update instrument active status.
     *
     * @param symbol instrument symbol used to locate market data
     * @param request request payload supplied by the client
     * @return update instrument active status result
     */
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

    /**
     * Handles read requests for get provider statuses.
     *
     * @return provider statuses result
     */
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
