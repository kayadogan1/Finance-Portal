package com.finance.shared;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionDto(
        TransactionType transactionType,
        String instrumentSymbol,
        String instrumentName,
        Currency currency,
        BigDecimal quantity,
        BigDecimal price,
        BigDecimal totalAmount,
        LocalDateTime dateTime
) {
}
