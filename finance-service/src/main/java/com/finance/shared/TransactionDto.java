package com.finance.shared;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionDto(
        TransactionType transactionType,
        String instrumentName,
        BigDecimal quantity,
        BigDecimal price,
        LocalDateTime dateTime
) {
}
