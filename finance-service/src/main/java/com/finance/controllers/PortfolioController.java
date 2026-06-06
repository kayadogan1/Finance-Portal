package com.finance.controllers;

import com.finance.handling.ApiResult;
import com.finance.services.InflationService;
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


/**
 * REST controller for portfolio operations.
 */
@RestController
@RequestMapping("/api/portfolio")
public class PortfolioController {
    private final Logger logger = LogManager.getLogger(PortfolioController.class);
    private final PortfolioService portfolioService;
    private final TransactionService transactionService;
    private final InflationService inflationService;
    /**
     * Creates a new PortfolioController with its required dependencies.
     *
     * @param portfolioService portfolio service value
     * @param transactionService transaction service value
     * @param inflationService inflation service value
     */
    public PortfolioController(PortfolioService portfolioService, TransactionService transactionService, InflationService inflationService) {
        this.portfolioService= portfolioService;
        this.transactionService = transactionService;
        this.inflationService = inflationService;
    }
    /**
     * Handles read requests for get all portfolios.
     *
     * @param jwt jwt value
     * @param displayCurrency display currency value
     * @return all portfolios result
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResult<List<PortfolioReadDto>>> getAllPortfolios(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "TRY") Currency displayCurrency
    ){
        logger.info("Fetching all portfolios for user: {}", jwt.getSubject());
        return ResponseEntity.ok(ApiResult.success(portfolioService.getAllPortfolios(displayCurrency),"all portfolios fetched",200) ) ;
    }

    /**
     * Handles read requests for get user portfolios.
     *
     * @param jwt jwt value
     * @param displayCurrency display currency value
     * @return user portfolios result
     */
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

    /**
     * Handles read requests for get portfolio.
     *
     * @param jwt jwt value
     * @param portfolioId identifier of the portfolio
     * @param displayCurrency display currency value
     * @return portfolio result
     */
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
    /**
     * Handles create or command requests for create portfolio.
     *
     * @param portfolio portfolio value
     * @param jwt jwt value
     * @return create portfolio result
     */
    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<Void>> createPortfolio(@RequestBody @Valid PortfolioDto portfolio,@AuthenticationPrincipal Jwt jwt) {
        portfolioService.createPortfolio(jwt.getSubject(), portfolio);
        return ResponseEntity.ok(ApiResult.success(null,"record succeed",200));
    }

    /**
     * Handles read requests for get portfolio history.
     *
     * @param jwt jwt value
     * @param portfolioId identifier of the portfolio
     * @param portfolioRange portfolio range value
     * @param displayCurrency display currency value
     * @return portfolio history result
     */
    @GetMapping("/{portfolioId}/history")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<List<PerformanceLineChartDto>>> getPortfolioHistory(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID portfolioId,
            @RequestParam(defaultValue = "WEEKLY") PortfolioRange portfolioRange,
            @RequestParam(defaultValue = "TRY") Currency displayCurrency
    ) {
        List<PerformanceLineChartDto> history = portfolioService.getCalculatedPerformanceChartValues(jwt.getSubject(), portfolioId, portfolioRange, displayCurrency);
        return ResponseEntity.ok(ApiResult.success(history,"user portfolio history fetched",200));
    }
    /**
     * Handles read requests for get portfolio inflation effect.
     *
     * @param jwt jwt value
     * @param portfolioId identifier of the portfolio
     * @param currency currency value
     * @return portfolio inflation effect result
     */
    @GetMapping("/{portfolioId}/inflation-effect")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<PerformanceLineChartDtoWithInflationDto>> getPortfolioInflationEffect(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID portfolioId,
            @RequestParam(defaultValue = "TRY") Currency currency
    ) {
        PerformanceLineChartDtoWithInflationDto inflationEffect = inflationService.calculateInflationEffectInPortfolio(jwt.getSubject(), portfolioId,currency);
        return ResponseEntity.ok(ApiResult.success(inflationEffect, "portfolio inflation effect fetched", 200));
    }
    /**
     * Handles create or command requests for deposit funds.
     *
     * @param request request payload supplied by the client
     * @param jwt jwt value
     * @return deposit funds result
     */
    @PostMapping("/deposit")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<Void>> depositFunds(@RequestBody @Valid DepositRequest request, @AuthenticationPrincipal Jwt jwt) {
        portfolioService.depositCash(jwt.getSubject(),request.amount,request.portfolioId);
        logger.info("Deposited {} for user {}", request.amount, jwt.getSubject());
        return ResponseEntity.ok(ApiResult.success(null,"deposit success",200));
    }
    /**
     * Handles create or command requests for sell instrument.
     *
     * @param sellRequest sell request value
     * @param jwt jwt value
     * @return sell instrument result
     */
    @PostMapping("/sell")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<Void>> sellInstrument(@RequestBody @Valid BuyOrSellRequestDto sellRequest, @AuthenticationPrincipal Jwt jwt) {
        portfolioService.sellInstrument(jwt.getSubject(), sellRequest.instrumentSymbol(), sellRequest.quantity(),sellRequest.portfolioId());
        logger.info("User {} sold {} of {}", jwt.getSubject(), sellRequest.quantity(), sellRequest.instrumentSymbol());
        return ResponseEntity.ok(ApiResult.success(null,"sold success",200));

    }
    /**
     * Handles read requests for get current portfolio value.
     *
     * @param jwt jwt value
     * @param portfolioId identifier of the portfolio
     * @param displayCurrency display currency value
     * @return current portfolio value result
     */
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
    /**
     * Handles read requests for get portfolio type allocation.
     *
     * @param jwt jwt value
     * @param portfolioId identifier of the portfolio
     * @param displayCurrency display currency value
     * @return portfolio type allocation result
     */
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
    /**
     * Handles read requests for get current profit.
     *
     * @param jwt jwt value
     * @param portfolioId identifier of the portfolio
     * @param displayCurrency display currency value
     * @return current profit result
     */
    @GetMapping("/currentProfit/{portfolioId}")
    @PreAuthorize("hasAnyRole('USER')")
    public ResponseEntity<ApiResult<List<PortfolioCurrentProfitDto>>> getCurrentProfit(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID portfolioId,
            @RequestParam(defaultValue = "TRY") Currency displayCurrency
    ){
        return ResponseEntity.ok(ApiResult.success(portfolioService.calculateCurrentPortfolioProfit(jwt.getSubject(), portfolioId, displayCurrency),"user portfolio profit calculated ",200));

    }

    /**
     * Handles read requests for get user transactions by time stamp.
     *
     * @param jwt jwt value
     * @param startDate start date value
     * @return user transactions by time stamp result
     */
    @GetMapping("/transactions")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<List<TransactionDto>>> getUserTransactionsByTimeStamp(@AuthenticationPrincipal Jwt jwt,@RequestParam(required = false) LocalDate startDate){
        List<TransactionDto> transactionList= transactionService.getUserTransactionsByTimestamp(jwt.getSubject(), startDate);
        return ResponseEntity.ok(ApiResult.success(transactionList,"all user transactions fetched",200));

    }

    /**
     * Handles create or command requests for buy instrument.
     *
     * @param buyRequest buy request value
     * @param jwt jwt value
     * @return buy instrument result
     */
    @PostMapping("/buy")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResult<Void>> buyInstrument(@RequestBody @Valid BuyOrSellRequestDto buyRequest, @AuthenticationPrincipal Jwt jwt) {
        portfolioService.buyInstrument(jwt.getSubject(), buyRequest.instrumentSymbol(), buyRequest.quantity(),buyRequest.portfolioId());
        logger.info("User {} bought {} of {}", jwt.getSubject(), buyRequest.quantity(), buyRequest.instrumentSymbol());
        return ResponseEntity.ok(ApiResult.success(null,"user bought instrument",200));
    }
}
