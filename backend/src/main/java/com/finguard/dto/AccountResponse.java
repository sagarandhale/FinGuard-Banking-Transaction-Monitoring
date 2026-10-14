package com.finguard.dto;

import com.finguard.model.BankAccount;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AccountResponse(Long id, String accountNumber, String customerName,
                              String email, BigDecimal balance, LocalDateTime createdAt) {
    public static AccountResponse from(BankAccount a) {
        return new AccountResponse(a.getId(), a.getAccountNumber(), a.getCustomerName(),
                a.getEmail(), a.getBalance(), a.getCreatedAt());
    }
}
