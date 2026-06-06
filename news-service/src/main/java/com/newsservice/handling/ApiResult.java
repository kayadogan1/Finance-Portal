package com.newsservice.handling;

import java.time.LocalDateTime;

/**
 * Data transfer object that carries api result data.
 */
public  record ApiResult<T>(
        boolean success,
        T data,
        String message,
        int response,
        LocalDateTime timestamp
) {

    /**
     * Returns the result of success.
     *
     * @param data data value
     * @param message message value
     * @param response response payload returned by the downstream service
     * @return success result
     */
    public static <T> ApiResult<T> success(T data,String message,int response) {
        return new ApiResult<>(true,data,null,response,LocalDateTime.now());
    }
    /**
     * Returns the result of success.
     *
     * @param message message value
     * @param response response payload returned by the downstream service
     * @return success result
     */
    public static <T> ApiResult<T> success(String message,int response) {
        return new ApiResult<>(false,null,message,response,LocalDateTime.now());
    }

}
