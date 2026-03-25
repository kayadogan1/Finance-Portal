package com.finance.handling;

import com.finance.exceptions.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionAdvisor {

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResult<String> handleNotFoundException(NotFoundException exception) {
        return new ApiResult<>(false, null, exception.getMessage(), 404, LocalDateTime.now());
    }

    @ExceptionHandler(BadRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResult<String> handleBadRequestException(BadRequestException exception) {
        return new ApiResult<>(false, null, exception.getMessage(), 400, LocalDateTime.now());
    }

    @ExceptionHandler(AuthenticationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiResult<String> handleAuthenticationException(AuthenticationException exception) {
        return new ApiResult<>(false, null, exception.getMessage(), 401, LocalDateTime.now());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResult<String> handleGeneral(Exception exception) {
        return new ApiResult<>(false, null, exception.getMessage(), 500, LocalDateTime.now());
    }

    @ExceptionHandler(MethodNotAllowedException.class)
    @ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
    public ApiResult<String> handleMethodNotAllowedException(MethodNotAllowedException exception) {
        return new ApiResult<>(false, null, exception.getMessage(), 405, LocalDateTime.now());
    }

}