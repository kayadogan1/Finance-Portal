package com.finance.controllers;

import com.finance.handling.ApiResult;
import com.finance.models.User;
import com.finance.services.PortfolioService;
import com.finance.services.TransactionService;
import com.finance.services.UserService;
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
    private final UserService userService;
    private final TransactionService transactionService;
    public PortfolioController(PortfolioService portfolioService, UserService userService, TransactionService transactionService) {
        this.portfolioService= portfolioService;
        this.transactionService = transactionService;
        this.userService = userService;
    }
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResult<List<PortfolioReadDto>>> getAllPortfolios(@AuthenticationPrincipal Jwt jwt){
        User user = userService.getOrCreateUser(jwt);
        logger.info("Fetching all portfolios for user: {}", user.getId());
        return ResponseEntity.ok(ApiResult.success(portfolioService.getAllPortfolios(),"all portfolios fetched",200) ) ;
    }

    @GetMapping("/myPortfolios")
    @PreAuthorize("hasAnyRole('USER')")
    public ResponseEntity<ApiResult<List<PortfolioReadDto>>> getUserPortfolios(@AuthenticationPrincipal Jwt jwt){
        User user = userService.getOrCreateUser(jwt);
        logger.info("Fetching portfolios for user: {}", user.getId());
        List<PortfolioReadDto> userPortfolios = portfolioService.getUserPortfolios(user.getId());
        return ResponseEntity.ok(ApiResult.success(userPortfolios,"all user portfolios fetched",200));
    }

    @GetMapping("/{portfolioId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<PortfolioReadDto>> getPortfolio(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID portfolioId) {
        User user = userService.getOrCreateUser(jwt);
        logger.info("Fetching portfolio for user: {}", user.getId());
        return ResponseEntity.ok(ApiResult.success(portfolioService.getPortfolio(user.getId(),portfolioId),"portfolio fetched",200)
                 );
    }
    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<Void>> createPortfolio(@RequestBody @Valid PortfolioDto portfolio,@AuthenticationPrincipal Jwt jwt) {
        User user = userService.getOrCreateUser(jwt);
        portfolioService.createPortfolio(user.getId(),portfolio);
        return ResponseEntity.ok(ApiResult.success("record succeed",200));
    }

    @GetMapping("/{portfolioId}/history")
    public ResponseEntity<ApiResult<List<PerformanceLineChartDto>>> getPortfolioHistory(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID portfolioId,
            @RequestParam(defaultValue = "WEEKLY") PortfolioRange portfolioRange
    ) {
        User user = userService.getOrCreateUser(jwt);
        List<PerformanceLineChartDto> history = portfolioService.getCalculatedPerformanceChartValues(user.getId(), portfolioId, portfolioRange);
        return ResponseEntity.ok(ApiResult.success(history,"user portfolio history fetched",200));
    }
    @PostMapping("/deposit")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<Void>> depositFunds(@RequestBody @Valid DepositRequest request, @AuthenticationPrincipal Jwt jwt) {
        User user = userService.getOrCreateUser(jwt);
        portfolioService.depositCash(user.getId(),request.amount,request.portfolioId);
        logger.info("Deposited {} for user {}", request.amount, user.getId());
        return ResponseEntity.ok(ApiResult.success("deposit success",200));
    }
    @PostMapping("/sell")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<Void>> sellInstrument(@RequestBody @Valid BuyOrSellRequestDto sellRequest, @AuthenticationPrincipal Jwt jwt) {
        User user = userService.getOrCreateUser(jwt);
        portfolioService.sellInstrument(user.getId(), sellRequest.instrumentSymbol(), sellRequest.quantity(),sellRequest.portfolioId());
        logger.info("User {} sold {} of {}", user.getId(), sellRequest.quantity(), sellRequest.instrumentSymbol());
        return ResponseEntity.ok(ApiResult.success("sold success",200));

    }
    @GetMapping("value/{portfolioId}")
    public ResponseEntity<ApiResult<List<PieChartDto>>> getCurrentPortfolioValue(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID portfolioId) {
        User user = userService.getOrCreateUser(jwt);
         List<PieChartDto> pieChartList =  portfolioService.getPortfolioChartValues(user.getId(), portfolioId);
         return ResponseEntity.ok(ApiResult.success(pieChartList,"current all portfolio values fetched",200));

    }
    @GetMapping("/transactions")
    public ResponseEntity<ApiResult<List<TransactionDto>>> getUserTransactionsByTimeStamp(@AuthenticationPrincipal Jwt jwt,@RequestParam(required = false) LocalDate startDate){
        List<TransactionDto> transactionList= transactionService.getUserTransactionsByTimestamp(jwt.getId(), startDate);
        return ResponseEntity.ok(ApiResult.success(transactionList,"all user transactions fetched",200));

    }

    @PostMapping("/buy")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<Void>> buyInstrument(@RequestBody @Valid BuyOrSellRequestDto buyRequest, @AuthenticationPrincipal Jwt jwt) {
        User user = userService.getOrCreateUser(jwt);

        portfolioService.buyInstrument(user.getId(), buyRequest.instrumentSymbol(), buyRequest.quantity(),buyRequest.portfolioId());
        logger.info("User {} bought {} of {}", user.getId(), buyRequest.quantity(), buyRequest.instrumentSymbol());
        return ResponseEntity.ok(ApiResult.success("user bought instrument",200));
    }
}
