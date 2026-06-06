package com.newsservice.handling;

import com.newsservice.exceptions.*;
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
    private final static Logger logger = LogManager.getLogger(GlobalExceptionAdvisor.class);
    /**
     * Returns the result of handle not found exception.
     *
     * @param exception exception value
     * @return handle not found exception result
     */
    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResult<String> handleNotFoundException(NotFoundException exception) {
        logger.error("not found exception :{} {}",exception.getMessage(),exception);
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
        logger.error("bad request exception :{} {}",exception.getMessage(),exception);
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
        logger.error("auth exception :{} {}",exception.getMessage(),exception);
        return new ApiResult<>(false, null, exception.getMessage(), 401, LocalDateTime.now());
    }

    /**
     * Returns the result of handle method not allowed exception.
     *
     * @param exception exception value
     * @return handle method not allowed exception result
     */
    @ExceptionHandler(MethodNotAllowedException.class)
    @ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
    public ApiResult<String> handleMethodNotAllowedException(MethodNotAllowedException exception) {
        return new ApiResult<>(false, null, exception.getMessage(), 403, LocalDateTime.now());
    }

    /**
     * Returns the result of handle general exception.
     *
     * @param exception exception value
     * @return handle general exception result
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResult<String> handleGeneralException(Exception exception) {
        logger.error("unexpected exception :{} {}", exception.getMessage(), exception);
        return new ApiResult<>(false, null, "Beklenmeyen bir hata oluştu", 500, LocalDateTime.now());
    }

}
