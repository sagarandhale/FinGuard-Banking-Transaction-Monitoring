package com.finguard.dto;

import com.finguard.model.TransactionAlert;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AlertResponse(Long id, Long transactionId, String ruleCode, String message,
                            BigDecimal amount, boolean reviewed, String reviewNote,
                            LocalDateTime createdAt) {
    public static AlertResponse from(TransactionAlert a) {
        return new AlertResponse(a.getId(), a.getTransaction().getId(), a.getRuleCode(),
                a.getMessage(), a.getTransaction().getAmount(), a.isReviewed(),
                a.getReviewNote(), a.getCreatedAt());
    }
}
