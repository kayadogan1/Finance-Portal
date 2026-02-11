package com.finance.controllers;

import com.finance.models.User;
import com.finance.services.PortfolioService;
import com.finance.services.UserService;
import com.finance.shared.BuyOrSellRequestDto;
import com.finance.shared.DepositRequest;
import com.finance.shared.PerformanceLineChartDto;
import com.finance.shared.PortfolioDto;
import jakarta.validation.Valid;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;


@RestController
@RequestMapping("/api/portfolio")
public class PortfolioController {
    private final Logger logger = LogManager.getLogger(PortfolioController.class);
    private final PortfolioService portfolioService;
    private final UserService userService;
    public PortfolioController(PortfolioService portfolioService, UserService userService) {
        this.portfolioService= portfolioService;
        this.userService = userService;
    }
    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<List<PortfolioDto>> getAllPortfolios(@AuthenticationPrincipal Jwt jwt){
        User user = userService.getOrCreateUser(jwt);
        logger.info("Fetching all portfolios for user: {}", user.getId());
        return ResponseEntity.ok(portfolioService.getAllPortfolios()) ;
    }


    @GetMapping("/{portfolioId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<PortfolioDto> getPortfolio(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID portfolioId) {
        User user = userService.getOrCreateUser(jwt);
        logger.info("Fetching portfolio for user: {}", user.getId());
        return ResponseEntity.ok(
                portfolioService.getPortfolio(user.getId(),portfolioId )
        );
    }
    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<Void> createPortfolio(@RequestBody @Valid PortfolioDto portfolio,@AuthenticationPrincipal Jwt jwt) {
        User user = userService.getOrCreateUser(jwt);
        boolean result = portfolioService.createPortfolio(user.getId(),portfolio);
        if(result){
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.badRequest().build();
    }

    @GetMapping("/{portfolioId}/history")
    public ResponseEntity<List<PerformanceLineChartDto>> getPortfolioHistory(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID portfolioId,
            @RequestParam(defaultValue = "30") int days
    ) {
        User user = userService.getOrCreateUser(jwt);
        List<PerformanceLineChartDto> history = portfolioService.getPerformanceLineChartValues(user.getId(), portfolioId, days);

        if (history.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(history);
    }
    @PostMapping("/deposit")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<Void> depositFunds(@RequestBody @Valid DepositRequest request, @AuthenticationPrincipal Jwt jwt) {
        User user = userService.getOrCreateUser(jwt);
        portfolioService.depositCash(user.getId(),request.amount,request.portfolioId);
        logger.info("Deposited {} for user {}", request.amount, user.getId());
        return ResponseEntity.ok().build();
    }
    @PostMapping("/sell")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<Void> sellInstrument(@RequestBody @Valid BuyOrSellRequestDto sellRequest, @AuthenticationPrincipal Jwt jwt) {
        User user = userService.getOrCreateUser(jwt);
        portfolioService.sellInstrument(user.getId(), sellRequest.instrumentSymbol, sellRequest.quantity,sellRequest.portfolioId);
        logger.info("User {} sold {} of {}", user.getId(), sellRequest.quantity, sellRequest.instrumentSymbol);
        return ResponseEntity.ok().build();

    }

    @PostMapping("/buy")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<Void> buyInstrument(@RequestBody @Valid BuyOrSellRequestDto buyRequest, @AuthenticationPrincipal Jwt jwt) {
        User user = userService.getOrCreateUser(jwt);

        portfolioService.buyInstrument(user.getId(), buyRequest.instrumentSymbol, buyRequest.quantity,buyRequest.portfolioId);
        logger.info("User {} bought {} of {}", user.getId(), buyRequest.quantity, buyRequest.instrumentSymbol);
        return ResponseEntity.ok().build();
    }
}
