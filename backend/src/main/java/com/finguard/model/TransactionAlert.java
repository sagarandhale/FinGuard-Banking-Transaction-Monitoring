package com.finguard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "transaction_alerts", indexes = {
        @Index(name = "idx_alert_reviewed", columnList = "reviewed"),
        @Index(name = "idx_alert_created_at", columnList = "created_at")
})
public class TransactionAlert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "transaction_id", nullable = false)
    private BankTransaction transaction;

    @Column(nullable = false, length = 80)
    private String ruleCode;

    @Column(nullable = false, length = 250)
    private String message;

    @Column(nullable = false)
    private boolean reviewed = false;

    @Column(length = 250)
    private String reviewNote;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    protected TransactionAlert() {}

    public TransactionAlert(BankTransaction transaction, String ruleCode, String message) {
        this.transaction = transaction;
        this.ruleCode = ruleCode;
        this.message = message;
        this.createdAt = LocalDateTime.now();
        this.reviewed = false;
    }

    public Long getId() { return id; }
    public BankTransaction getTransaction() { return transaction; }
    public String getRuleCode() { return ruleCode; }
    public String getMessage() { return message; }
    public boolean isReviewed() { return reviewed; }
    public String getReviewNote() { return reviewNote; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void review(String note) {
        this.reviewed = true;
        this.reviewNote = note;
    }
}
