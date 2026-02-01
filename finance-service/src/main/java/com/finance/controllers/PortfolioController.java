package com.finance.controllers;

import com.finance.models.Portfolio;
import com.finance.services.PortfolioService;
import com.finance.shared.BuyOrSellRequestDto;
import com.finance.shared.DepositRequest;
import jakarta.validation.Valid;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;


@RestController()
@RequestMapping("/api/portfolio")
public class PortfolioController {
    private final Logger logger = LogManager.getLogger(PortfolioController.class);
    private final PortfolioService portfolioService;
    public PortfolioController(PortfolioService portfolioService){
        this.portfolioService= portfolioService;
    }
    @GetMapping
    public ResponseEntity<List<Portfolio>> getAllPortfolios(@RequestParam("userId") String userId){
        logger.info("Fetching portfolio for user: {}", userId);
        return ResponseEntity.ok(portfolioService.getAllPortfolios()) ;
    }
    @GetMapping("/{portfolioId}")
    public ResponseEntity<Portfolio> getPortfolio(
            String userId,
            @PathVariable UUID portfolioId) {

        return ResponseEntity.ok(
                portfolioService.getPortfolio(userId,portfolioId )
        );
    }

    @PostMapping("/deposit")
    public ResponseEntity<Void> depositFunds(@RequestBody @Valid DepositRequest request) {

        portfolioService.depositCash(request.userId, request.amount,request.portfolioId);
        logger.info("Deposited {} for user {}", request.amount, request.userId);
        return ResponseEntity.ok().build();
    }
    @PostMapping("/sell")
    public ResponseEntity<Void> sellInstrument(@RequestBody @Valid BuyOrSellRequestDto sellRequest) {

        portfolioService.sellInstrument(sellRequest.userId, sellRequest.instrumentSymbol, sellRequest.quantity,sellRequest.portfolioId);
        logger.info("User {} sold {} of {}", sellRequest.userId, sellRequest.quantity, sellRequest.instrumentSymbol);
        return ResponseEntity.ok().build();

    }

    @PostMapping("/buy")
    public ResponseEntity<Void> buyInstrument(@RequestBody @Valid BuyOrSellRequestDto buyRequest) {
        portfolioService.buyInstrument(buyRequest.userId, buyRequest.instrumentSymbol, buyRequest.quantity,buyRequest.portfolioId);
        logger.info("User {} bought {} of {}", buyRequest.userId, buyRequest.quantity, buyRequest.instrumentSymbol);
        return ResponseEntity.ok().build();
    }
}
