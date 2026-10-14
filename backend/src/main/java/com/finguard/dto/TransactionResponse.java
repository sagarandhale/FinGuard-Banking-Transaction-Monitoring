package com.finguard.dto;

import com.finguard.model.BankTransaction;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionResponse(Long id, String type, Long fromAccountId, String fromCustomer,
                                  Long toAccountId, String toCustomer, BigDecimal amount,
                                  String status, String description, LocalDateTime createdAt) {
    public static TransactionResponse from(BankTransaction t) {
        return new TransactionResponse(
                t.getId(), t.getType(),
                t.getFromAccount() == null ? null : t.getFromAccount().getId(),
                t.getFromAccount() == null ? null : t.getFromAccount().getCustomerName(),
                t.getToAccount() == null ? null : t.getToAccount().getId(),
                t.getToAccount() == null ? null : t.getToAccount().getCustomerName(),
                t.getAmount(), t.getStatus(), t.getDescription(), t.getCreatedAt());
    }
}
