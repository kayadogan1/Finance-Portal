package com.finance.controllers;

import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.repositories.MarketDataRepository;
import com.finance.services.InstrumentService;
import com.finance.services.MarketDataService;
import com.finance.shared.CandleDto;
import com.finance.shared.LineChartDto;
import com.finance.shared.TimeSlot;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/market")
public class MarketController {

    private final InstrumentService instrumentService;
    private final MarketDataRepository marketDataRepository;
    private final Logger logger = LogManager.getLogger(MarketController.class);
    private final MarketDataService marketDataService;

    public MarketController(InstrumentService instrumentService, MarketDataRepository marketDataRepository, MarketDataService marketDataService) {
        this.marketDataRepository = marketDataRepository;
        this.instrumentService = instrumentService;
        this.marketDataService = marketDataService;
    }
    @GetMapping("/{symbol}")
    public ResponseEntity<Instrument> getInstrumentBySymbol(@PathVariable String symbol){

        return instrumentService.getInstrumentBySymbol(symbol)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    logger.warn("Instrument with symbol {} not found.", symbol);
                    return ResponseEntity.notFound().build();
                });
    }
    @GetMapping
    public ResponseEntity<List<Instrument>> getAllInstruments(){
        List<Instrument> instruments = instrumentService.getAllInstruments();
        if(instruments.isEmpty()){
            logger.warn("No instruments found in the database.");
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(instruments);
    }

    @GetMapping("candles/{symbol}")
    public ResponseEntity<List<CandleDto>> getCandlesBySymbol(@PathVariable String symbol, @RequestParam(defaultValue = "M1")TimeSlot slot, @RequestParam(required = false)@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from
    ){
        logger.info("fetching candles for symbol {} with slot time: {}", symbol, slot);
        LocalDateTime startTime = from != null ? from : LocalDateTime.now().minusHours(24);
        List<CandleDto> candleDtoList = marketDataService.getMarketDataHistory(symbol,from,slot);
        if (startTime.isAfter(LocalDateTime.now())) {
            logger.warn("Invalid 'from' timestamp: {}. Cannot be in future.", startTime);
            return ResponseEntity.badRequest().build();
        }
        if(candleDtoList.isEmpty()){
            logger.warn("No candles found for symbol {}", symbol);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(candleDtoList);
    }
    @GetMapping("line/{symbol}")
    public ResponseEntity<List<LineChartDto>> getLinesBySymbol(@PathVariable String symbol, @RequestParam(required = false )@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)LocalDateTime dateTime){
        logger.info("fetching lines for symbol {} with date time: {}", symbol, dateTime);
        return ResponseEntity.noContent().build();
    }


    @GetMapping("/history/{symbol}")
    public ResponseEntity<List<MarketData>> getMarketDataHistory(@PathVariable String symbol, @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from){
        if(from.isAfter(LocalDateTime.now())){
            logger.warn("Invalid 'from' timestamp: {}. It cannot be in the future.", from);
            return ResponseEntity.badRequest().build();
        }
        List<MarketData> marketDataList = marketDataRepository.findByInstrumentSymbolAndTimestampAfterOrderByTimestampAsc(symbol, from);
        if(marketDataList.isEmpty()){
            logger.warn("No market data found for symbol {} after {}", symbol, from);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(marketDataList);

    }
}
