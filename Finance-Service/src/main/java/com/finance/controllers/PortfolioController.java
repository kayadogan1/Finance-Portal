package com.finance.controllers;

import com.finance.models.Portfolio;
import com.finance.services.PortfolioService;
import com.finance.shared.BuyRequest;
import com.finance.shared.DepositRequest;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController()
@RequestMapping("/api/portfolio")
public class PortfolioController {
    private final Logger logger = LogManager.getLogger(PortfolioController.class);
    private final PortfolioService portfolioService;
    public PortfolioController(PortfolioService portfolioService){
        this.portfolioService= portfolioService;
    }
    @GetMapping
    public ResponseEntity<Portfolio> getAllPortfolios(@RequestParam String userId){
        logger.info("Fetching portfolio for user: {}", userId);
        return ResponseEntity.ok(portfolioService.getOrCreatePortfolio(userId)) ;
    }

    @PostMapping("/deposit")
    public ResponseEntity<Void> depositFunds(@RequestBody DepositRequest request) {

        portfolioService.depositCash(request.userId, request.amount);
        logger.info("Deposited {} for user {}", request.amount, request.userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/buy")
    public ResponseEntity<Void> buyInstrument(@RequestBody BuyRequest buyRequest) {
        portfolioService.buyInstrument(buyRequest.userId, buyRequest.instrumentSymbol, buyRequest.quantity);
        logger.info("User {} bought {} of {}", buyRequest.userId, buyRequest.quantity, buyRequest.instrumentSymbol);
        return ResponseEntity.ok().build();
    }
}
