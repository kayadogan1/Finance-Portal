package com.finance.controllers;

import com.finance.handling.ApiResult;
import com.finance.models.MarketData;
import com.finance.repositories.MarketDataRepository;
import com.finance.services.InstrumentService;
import com.finance.services.MarketDataService;
import com.finance.shared.*;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * REST controller for market operations.
 */
@RestController
@RequestMapping("/api/market")
public class MarketController {

    private final InstrumentService instrumentService;
    private final MarketDataRepository marketDataRepository;
    private final Logger logger = LogManager.getLogger(MarketController.class);
    private final MarketDataService marketDataService;

    /**
     * Creates a new MarketController with its required dependencies.
     *
     * @param instrumentService instrument service value
     * @param marketDataRepository market data repository value
     * @param marketDataService market data service value
     */
    public MarketController(InstrumentService instrumentService, MarketDataRepository marketDataRepository, MarketDataService marketDataService) {
        this.marketDataRepository = marketDataRepository;
        this.instrumentService = instrumentService;
        this.marketDataService = marketDataService;
    }
    /**
     * Handles read requests for get instrument by symbol.
     *
     * @param symbol instrument symbol used to locate market data
     * @return instrument by symbol result
     */
    @GetMapping("/{symbol}")
    public ResponseEntity<ApiResult<InstrumentDto>> getInstrumentBySymbol(@PathVariable String symbol){
        var instrument = instrumentService.getInstrumentBySymbol(symbol);
        var instrumentDto = instrumentService.toInstrumentDto(instrument);
        return ResponseEntity.ok(ApiResult.success(instrumentDto,"instrument fetched",200));
    }
    /**
     * Handles read requests for get all instruments.
     *
     * @param q q value
     * @param type type value
     * @param market market value
     * @param currency currency value
     * @param page page value
     * @param size size value
     * @return all instruments result
     */
    @GetMapping
    public ResponseEntity<ApiResult<Page<InstrumentDto>>> getAllInstruments(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) InstrumentType type,
            @RequestParam(required = false) String market,
            @RequestParam(required = false) Currency currency,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {

        Page<InstrumentDto> instruments = instrumentService.getAllInstruments(q, type, market, currency, page, size);
        return ResponseEntity.ok(ApiResult.success(instruments, "instruments fetched", 200));
    }
    /**
     * Handles read requests for get market movers.
     *
     * @param direction direction value
     * @param market market value
     * @param type type value
     * @param currency currency value
     * @param page page value
     * @param size size value
     * @return market movers result
     */
    @GetMapping("movers")
    public ResponseEntity<ApiResult<Page<InstrumentDto>>> getMarketMovers(
            @RequestParam(defaultValue = "GAINERS") String direction,
            @RequestParam(required = false) String market,
            @RequestParam(required = false) InstrumentType type,
            @RequestParam(required = false) Currency currency,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ){
        Page<InstrumentDto> movers = instrumentService.getMarketMovers(direction, market, type, currency, page, size);
        return ResponseEntity.ok(ApiResult.success(movers, "market movers fetched", 200));
    }

    /**
     * Handles read requests for get candles by symbol.
     *
     * @param symbol instrument symbol used to locate market data
     * @param slot slot value
     * @param from from value
     * @return candles by symbol result
     */
    @GetMapping("candles/{symbol}")
    public ResponseEntity<ApiResult<List<CandleDto>>> getCandlesBySymbol(@PathVariable String symbol, @RequestParam(defaultValue = "M1")TimeSlot slot, @RequestParam(required = false)@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from
    ){
        logger.info("fetching candles for symbol {} with slot time: {}", symbol, slot);
        List<CandleDto> candleDtoList = marketDataService.getMarketDataHistory(symbol, from, slot);
        return ResponseEntity.ok(ApiResult.success(candleDtoList,"all candle data fetched",200));
    }
    /**
     * Handles read requests for get lines by symbol.
     *
     * @param symbol instrument symbol used to locate market data
     * @param dateTime date time value
     * @return lines by symbol result
     */
    @GetMapping("line/{symbol}")
    public ResponseEntity<ApiResult<List<LineChartDto>>> getLinesBySymbol(@PathVariable String symbol, @RequestParam(required = false )@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)LocalDateTime dateTime){
        logger.info("fetching lines for symbol {} with date time: {}", symbol, dateTime);

        List<LineChartDto> lineChartDtoList =marketDataService.getLineChartDataFrom(symbol, dateTime);
        return ResponseEntity.ok(ApiResult.success(lineChartDtoList,"line chart data fetched",200));
    }


    /**
     * Handles read requests for get market data history.
     *
     * @param symbol instrument symbol used to locate market data
     * @param from from value
     * @return market data history result
     */
    @GetMapping("/history/{symbol}")
    public ResponseEntity<ApiResult<List<MarketData>>> getMarketDataHistory(
            @PathVariable String symbol,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from) {

        if (from != null && from.isAfter(LocalDateTime.now())) {
            logger.warn("Invalid 'from' timestamp: {}. It cannot be in the future.", from);
            return ResponseEntity.badRequest().build();
        }
        List<MarketData> marketDataList = from != null
                ? marketDataRepository.findByInstrumentSymbolAndTimestampGreaterThanEqualOrderByTimestampAsc(symbol, from)
                : marketDataRepository.findByInstrumentSymbolOrderByTimestampAsc(symbol);
        return ResponseEntity.ok(ApiResult.success(marketDataList,"all market data fetched",200));
    }

    /**
     * Handles read requests for get hypothetical return.
     *
     * @param symbol instrument symbol used to locate market data
     * @param purchaseDate purchase date value
     * @param quantity quantity value
     * @param displayCurrency display currency value
     * @return hypothetical return result
     */
    @GetMapping("/hypothetical-return/{symbol}")
    public ResponseEntity<ApiResult<HypotheticalReturnDto>> getHypotheticalReturn(
            @PathVariable String symbol,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate purchaseDate,
            @RequestParam(defaultValue = "1") BigDecimal quantity,
            @RequestParam(required = false) Currency displayCurrency
    ) {
        HypotheticalReturnDto result = marketDataService.calculateHypotheticalReturn(
                symbol,
                purchaseDate,
                quantity,
                displayCurrency
        );
        return ResponseEntity.ok(ApiResult.success(result, "hypothetical return calculated", 200));
    }
}
