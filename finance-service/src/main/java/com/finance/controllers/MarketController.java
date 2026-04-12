package com.finance.controllers;

import com.finance.handling.ApiResult;
import com.finance.models.Instrument;
import com.finance.models.MarketData;
import com.finance.repositories.MarketDataRepository;
import com.finance.services.InstrumentService;
import com.finance.services.MarketDataService;
import com.finance.shared.CandleDto;
import com.finance.shared.InstrumentDto;
import com.finance.shared.LineChartDto;
import com.finance.shared.TimeSlot;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.data.domain.Page;
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
    public ResponseEntity<ApiResult<Instrument>> getInstrumentBySymbol(@PathVariable String symbol){
        return ResponseEntity.ok(ApiResult.success(instrumentService.getInstrumentBySymbol(symbol),"instrument fetched",200));
    }
    @GetMapping
    public ResponseEntity<ApiResult<Page<InstrumentDto>>> getAllInstruments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<InstrumentDto> instruments = instrumentService.getAllInstruments(page, size);
        return ResponseEntity.ok(ApiResult.success(instruments, "all instruments fetched", 200));
    }

    @GetMapping("candles/{symbol}")
    public ResponseEntity<ApiResult<List<CandleDto>>> getCandlesBySymbol(@PathVariable String symbol, @RequestParam(defaultValue = "M1")TimeSlot slot, @RequestParam(required = false)@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from
    ){
        logger.info("fetching candles for symbol {} with slot time: {}", symbol, slot);
        LocalDateTime startTime = from != null ? from : LocalDateTime.now().minusHours(24);
        List<CandleDto> candleDtoList = marketDataService.getMarketDataHistory(symbol,startTime,slot);
        return ResponseEntity.ok(ApiResult.success(candleDtoList,"all candle data fetched",200));
    }
    @GetMapping("line/{symbol}")
    public ResponseEntity<ApiResult<List<LineChartDto>>> getLinesBySymbol(@PathVariable String symbol, @RequestParam(required = false )@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)LocalDateTime dateTime){
        logger.info("fetching lines for symbol {} with date time: {}", symbol, dateTime);

        List<LineChartDto> lineChartDtoList =marketDataService.getLineChartDataFrom(symbol, dateTime);
        return ResponseEntity.ok(ApiResult.success(lineChartDtoList,"line chart data fetched",200));
    }



    @GetMapping("/history/{symbol}")
    public ResponseEntity<ApiResult<List<MarketData>>> getMarketDataHistory(
            @PathVariable String symbol,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from) {

        if (from != null && from.isAfter(LocalDateTime.now())) {
            logger.warn("Invalid 'from' timestamp: {}. It cannot be in the future.", from);
            return ResponseEntity.badRequest().build();
        }
        LocalDateTime startTime = from != null ? from : LocalDateTime.now().minusHours(24);
        List<MarketData> marketDataList = marketDataRepository.findByInstrumentSymbolAndTimestampAfterOrderByTimestampAsc(symbol, startTime);
        return ResponseEntity.ok(ApiResult.success(marketDataList,"all market data fetched",200));
    }
}
