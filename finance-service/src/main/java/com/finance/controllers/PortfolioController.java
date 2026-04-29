package com.finance.controllers;

import com.finance.handling.ApiResult;
import com.finance.services.PortfolioService;
import com.finance.services.TransactionService;
import com.finance.shared.*;
import jakarta.validation.Valid;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


@RestController
@RequestMapping("/api/portfolio")
public class PortfolioController {
    private final Logger logger = LogManager.getLogger(PortfolioController.class);
    private final PortfolioService portfolioService;
    private final TransactionService transactionService;
    public PortfolioController(PortfolioService portfolioService, TransactionService transactionService) {
        this.portfolioService= portfolioService;
        this.transactionService = transactionService;
    }
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResult<List<PortfolioReadDto>>> getAllPortfolios(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "TRY") Currency displayCurrency
    ){
        logger.info("Fetching all portfolios for user: {}", jwt.getSubject());
        return ResponseEntity.ok(ApiResult.success(portfolioService.getAllPortfolios(displayCurrency),"all portfolios fetched",200) ) ;
    }

    @GetMapping("/myPortfolios")
    @PreAuthorize("hasAnyRole('USER')")
    public ResponseEntity<ApiResult<List<PortfolioReadDto>>> getUserPortfolios(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "TRY") Currency displayCurrency
    ){
        logger.info("Fetching portfolios for user: {}", jwt.getSubject());
        List<PortfolioReadDto> userPortfolios = portfolioService.getUserPortfolios(jwt.getSubject(), displayCurrency);
        return ResponseEntity.ok(ApiResult.success(userPortfolios,"all user portfolios fetched",200));
    }

    @GetMapping("/{portfolioId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<PortfolioReadDto>> getPortfolio(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID portfolioId,
            @RequestParam(defaultValue = "TRY") Currency displayCurrency) {
        logger.info("Fetching portfolio for user: {}", jwt.getSubject());
        return ResponseEntity.ok(ApiResult.success(portfolioService.getPortfolio(jwt.getSubject(), portfolioId, displayCurrency),"portfolio fetched",200)
                 );
    }
    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<Void>> createPortfolio(@RequestBody @Valid PortfolioDto portfolio,@AuthenticationPrincipal Jwt jwt) {
        portfolioService.createPortfolio(jwt.getSubject(), portfolio);
        return ResponseEntity.ok(ApiResult.success(null,"record succeed",200));
    }

    @GetMapping("/{portfolioId}/history")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<List<PerformanceLineChartDto>>> getPortfolioHistory(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID portfolioId,
            @RequestParam(defaultValue = "WEEKLY") PortfolioRange portfolioRange
    ) {
        List<PerformanceLineChartDto> history = portfolioService.getCalculatedPerformanceChartValues(jwt.getSubject(), portfolioId, portfolioRange);
        return ResponseEntity.ok(ApiResult.success(history,"user portfolio history fetched",200));
    }
    @PostMapping("/deposit")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<Void>> depositFunds(@RequestBody @Valid DepositRequest request, @AuthenticationPrincipal Jwt jwt) {
        portfolioService.depositCash(jwt.getSubject(),request.amount,request.portfolioId);
        logger.info("Deposited {} for user {}", request.amount, jwt.getSubject());
        return ResponseEntity.ok(ApiResult.success(null,"deposit success",200));
    }
    @PostMapping("/sell")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<Void>> sellInstrument(@RequestBody @Valid BuyOrSellRequestDto sellRequest, @AuthenticationPrincipal Jwt jwt) {
        portfolioService.sellInstrument(jwt.getSubject(), sellRequest.instrumentSymbol(), sellRequest.quantity(),sellRequest.portfolioId());
        logger.info("User {} sold {} of {}", jwt.getSubject(), sellRequest.quantity(), sellRequest.instrumentSymbol());
        return ResponseEntity.ok(ApiResult.success(null,"sold success",200));

    }
    @GetMapping("value/{portfolioId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<List<PieChartDto>>> getCurrentPortfolioValue(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID portfolioId,
            @RequestParam(defaultValue = "TRY") Currency displayCurrency
    ) {
         List<PieChartDto> pieChartList =  portfolioService.getPortfolioChartValues(jwt.getSubject(), portfolioId, displayCurrency);
         return ResponseEntity.ok(ApiResult.success(pieChartList,"current all portfolio values fetched",200));

    }
    @GetMapping("allocation/type/{portfolioId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<List<PieChartDto>>> getPortfolioTypeAllocation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID portfolioId,
            @RequestParam(defaultValue = "TRY") Currency displayCurrency
    ) {
        return ResponseEntity.ok(ApiResult.success(
                portfolioService.getPortfolioTypeAllocation(jwt.getSubject(), portfolioId, displayCurrency),
                "portfolio type allocation fetched",
                200
        ));
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<List<TransactionDto>>> getUserTransactionsByTimeStamp(@AuthenticationPrincipal Jwt jwt,@RequestParam(required = false) LocalDate startDate){
        List<TransactionDto> transactionList= transactionService.getUserTransactionsByTimestamp(jwt.getSubject(), startDate);
        return ResponseEntity.ok(ApiResult.success(transactionList,"all user transactions fetched",200));

    }

    @PostMapping("/buy")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<Void>> buyInstrument(@RequestBody @Valid BuyOrSellRequestDto buyRequest, @AuthenticationPrincipal Jwt jwt) {
        portfolioService.buyInstrument(jwt.getSubject(), buyRequest.instrumentSymbol(), buyRequest.quantity(),buyRequest.portfolioId());
        logger.info("User {} bought {} of {}", jwt.getSubject(), buyRequest.quantity(), buyRequest.instrumentSymbol());
        return ResponseEntity.ok(ApiResult.success(null,"user bought instrument",200));
    }
}
