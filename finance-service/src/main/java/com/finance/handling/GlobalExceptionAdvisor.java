package com.finance.handling;

import com.finance.exceptions.*;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionAdvisor {

    private static final Logger logger = LogManager.getLogger(GlobalExceptionAdvisor.class);

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResult<String> handleNotFoundException(NotFoundException exception) {
        logger.warn("Not found: {}", exception.getMessage());
        return new ApiResult<>(false, null, exception.getMessage(), 404, LocalDateTime.now());
    }

    @ExceptionHandler(BadRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResult<String> handleBadRequestException(BadRequestException exception) {
        logger.warn("Bad request: {}", exception.getMessage());
        return new ApiResult<>(false, null, exception.getMessage(), 400, LocalDateTime.now());
    }

    @ExceptionHandler(AuthenticationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiResult<String> handleAuthenticationException(AuthenticationException exception) {
        logger.warn("Auth error: {}", exception.getMessage());
        return new ApiResult<>(false, null, exception.getMessage(), 401, LocalDateTime.now());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResult<String> handleGeneral(Exception exception) {
        logger.error("Unhandled exception: {}", exception.getMessage(), exception);
        return new ApiResult<>(false, null, exception.getMessage(), 500, LocalDateTime.now());
    }

    @ExceptionHandler(YahooFetchException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResult<String> handleYahooFetchException(YahooFetchException exception) {
        logger.error("Yahoo fetch error: {}", exception.getMessage(), exception);
        return new ApiResult<>(false, null, exception.getMessage(), 500, LocalDateTime.now());
    }

    @ExceptionHandler(InsufficientBalanceException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResult<String> handleInsufficientBalanceException(InsufficientBalanceException exception){
        logger.error("Error: Insufficient balance, please add funds.{}",exception.getMessage());
        return new ApiResult<>(false,null,"Insufficient balance please add cash",400,LocalDateTime.now());
    }

    @ExceptionHandler(PortfolioInsufficientException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResult<String > handlePortfolioInsufficientException(PortfolioInsufficientException exception){
        logger.error("Error:Insufficient  instrument quantity balance. {} ",exception.getMessage());
        return new ApiResult<>(false,null, exception.getMessage(),400,LocalDateTime.now());
    }
    @ExceptionHandler(PortfolioNotFoundException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResult<String > handlePortfolioNotFoundException(PortfolioNotFoundException exception){
        logger.error("Error: Portfolio Not found. {} ",exception.getMessage());
        return new ApiResult<>(false,null, exception.getMessage(),400,LocalDateTime.now());
    }}