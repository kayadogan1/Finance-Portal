package com.finance.handling;

import java.time.LocalDateTime;

public  record ApiResult<T>(
        boolean success,
        T data,
        String message,
        int response,
        LocalDateTime timestamp
) {

    public static <T> ApiResult<T> success(T data,String message,int response) {
        return new ApiResult<>(true,data,message,response,LocalDateTime.now());
    }

}
