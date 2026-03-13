package com.newsservice.handling;

import java.time.LocalDateTime;

public  record ApiResult<T>(
        boolean success,
        T data,
        String message,
        int response,
        LocalDateTime timestamp
) {

    public static <T> ApiResult<T> success(T data,String message,int response) {
        return new ApiResult<>(true,data,null,response,LocalDateTime.now());
    }
    public static <T> ApiResult<T> success(String message,int response) {
        return new ApiResult<>(false,null,message,response,LocalDateTime.now());
    }

}
