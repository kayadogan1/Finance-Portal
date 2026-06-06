package com.example.api.error;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * REST controller for classification exception handler operations.
 */
@RestControllerAdvice
public class ClassificationExceptionHandler {

    private static final Logger logger = LogManager.getLogger(ClassificationExceptionHandler.class);

    /**
     * Returns the result of handle illegal argument.
     *
     * @param exception exception value
     * @return handle illegal argument result
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleIllegalArgument(IllegalArgumentException exception) {
        logger.warn("Classification request failed validation: {}", exception.getMessage());
        return new ErrorResponse("BAD_REQUEST", exception.getMessage());
    }

    /**
     * Returns the result of handle generic.
     *
     * @param exception exception value
     * @return handle generic result
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGeneric(Exception exception) {
        logger.error("Unhandled classification error", exception);
        return new ErrorResponse("INTERNAL_ERROR", exception.getMessage());
    }
}
