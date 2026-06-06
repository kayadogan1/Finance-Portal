package com.finance.shared;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Data transfer object that carries transaction dto data.
 */
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
