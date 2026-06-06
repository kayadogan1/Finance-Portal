package com.finance.handling;

import com.finance.exceptions.*;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.time.LocalDateTime;

/**
 * REST controller for global exception advisor operations.
 */
@RestControllerAdvice
public class GlobalExceptionAdvisor {

    private static final Logger logger = LogManager.getLogger(GlobalExceptionAdvisor.class);

    /**
     * Returns the result of handle not found exception.
     *
     * @param exception exception value
     * @return handle not found exception result
     */
    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResult<String> handleNotFoundException(NotFoundException exception) {
        logger.warn("Not found: {}", exception.getMessage());
        return new ApiResult<>(false, null, exception.getMessage(), 404, LocalDateTime.now());
    }

    /**
     * Returns the result of handle bad request exception.
     *
     * @param exception exception value
     * @return handle bad request exception result
     */
    @ExceptionHandler(BadRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResult<String> handleBadRequestException(BadRequestException exception) {
        logger.warn("Bad request: {}", exception.getMessage());
        return new ApiResult<>(false, null, exception.getMessage(), 400, LocalDateTime.now());
    }

    /**
     * Returns the result of handle authentication exception.
     *
     * @param exception exception value
     * @return handle authentication exception result
     */
    @ExceptionHandler(AuthenticationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiResult<String> handleAuthenticationException(AuthenticationException exception) {
        logger.warn("Auth error: {}", exception.getMessage());
        return new ApiResult<>(false, null, exception.getMessage(), 401, LocalDateTime.now());
    }

    /**
     * Returns the result of handle general.
     *
     * @param exception exception value
     * @return handle general result
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResult<String> handleGeneral(Exception exception) {
        logger.error("Unhandled exception: {}", exception.getMessage(), exception);
        return new ApiResult<>(false, null, exception.getMessage(), 500, LocalDateTime.now());
    }

    /**
     * Returns the result of handle yahoo fetch exception.
     *
     * @param exception exception value
     * @return handle yahoo fetch exception result
     */
    @ExceptionHandler(YahooFetchException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResult<String> handleYahooFetchException(YahooFetchException exception) {
        logger.error("Yahoo fetch error: {}", exception.getMessage(), exception);
        return new ApiResult<>(false, null, exception.getMessage(), 500, LocalDateTime.now());
    }

    /**
     * Returns the result of handle insufficient balance exception.
     *
     * @param exception exception value
     * @return handle insufficient balance exception result
     */
    @ExceptionHandler(InsufficientBalanceException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResult<String> handleInsufficientBalanceException(InsufficientBalanceException exception){
        logger.error("Error: Insufficient balance, please add funds.{}",exception.getMessage());
        return new ApiResult<>(false,null,"Insufficient balance please add cash",400,LocalDateTime.now());
    }

    /**
     * Returns the result of handle portfolio insufficient exception.
     *
     * @param exception exception value
     * @return handle portfolio insufficient exception result
     */
    @ExceptionHandler(PortfolioInsufficientException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResult<String > handlePortfolioInsufficientException(PortfolioInsufficientException exception){
        logger.error("Error:Insufficient  instrument quantity balance. {} ",exception.getMessage());
        return new ApiResult<>(false,null, exception.getMessage(),400,LocalDateTime.now());
    }
    /**
     * Returns the result of handle portfolio not found exception.
     *
     * @param exception exception value
     * @return handle portfolio not found exception result
     */
    @ExceptionHandler(PortfolioNotFoundException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResult<String > handlePortfolioNotFoundException(PortfolioNotFoundException exception){
        logger.error("Error: Portfolio Not found. {} ",exception.getMessage());
        return new ApiResult<>(false,null, exception.getMessage(),400,LocalDateTime.now());
    }}