package com.finance.services;

import com.finance.config.InstrumentPropertiesConfig;
import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.concurrent.Executors;

@Service
public class SchedulerService {
    private final FetchMarketDataService yahooService;
    private final CryptoService cryptoService;
    private final InstrumentPropertiesConfig config;
    private final Tracer tracer;
    private final Logger logger = LogManager.getLogger(SchedulerService.class);
    public SchedulerService(FetchMarketDataService yahooService, CryptoService cryptoService,Tracer tracer ,InstrumentPropertiesConfig config) {
        this.yahooService = yahooService;
        this.cryptoService = cryptoService;
        this.config = config;
        this.tracer = tracer;
    }
    @Scheduled(initialDelay = 0, fixedRate = 500000)
    public void updateGeneralMarkets() {
        Span span = tracer.nextSpan().name("scheduler.update-general-markets").start();
        try (Tracer.SpanInScope ignored = tracer.withSpan(span)) {
            logger.info("Updating general market data (stocks, forex, indices) from Yahoo...");
            yahooService.updateAllMarketData();
        } catch (Exception ex) {
            span.error(ex);
            throw ex;
        } finally {
            span.end();
        }
    }

  @Scheduled(initialDelay = 0, fixedRate = 500000)
    public void updateBinanceCryptoData() {
        Span span = tracer.nextSpan().name("scheduler.update-binance-crypto").start();
        try (Tracer.SpanInScope ignored = tracer.withSpan(span)) {
            if (config.getCrypto().isEmpty()) {
                logger.info("No cryptocurrencies configured for update.");
                return;
            }
            logger.info("Updating cryptocurrency data from Binance...");
            try(var executor = Executors.newVirtualThreadPerTaskExecutor()){
               config.getCrypto().keySet().forEach(key -> executor.submit(tracer.currentTraceContext().wrap(() -> {
                   Span childSpan = tracer.nextSpan(span)
                           .name("scheduler.fetch-crypto")
                           .tag("crypto.symbol", key)
                           .start();
                   try (Tracer.SpanInScope childScope = tracer.withSpan(childSpan)) {
                       cryptoService.fetchAndStoreCryptoData(key);
                   } catch (Exception ex) {
                       childSpan.error(ex);
                       throw ex;
                   } finally {
                       childSpan.end();
                   }
               })));
            }
            logger.info("Binance crypto data completed.");
        } catch (Exception ex) {
            span.error(ex);
            throw ex;
        } finally {
            span.end();
        }
    }
}
