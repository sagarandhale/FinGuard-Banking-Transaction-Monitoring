package com.finguard.repository;

import com.finguard.model.BankTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BankTransactionRepository extends JpaRepository<BankTransaction, Long> {
    Optional<BankTransaction> findByIdempotencyKey(String idempotencyKey);
    List<BankTransaction> findTop100ByOrderByCreatedAtDesc();
    List<BankTransaction> findByFromAccountIdAndCreatedAtAfterAndTypeOrderByCreatedAtDesc(
            Long fromAccountId, LocalDateTime after, String type);
}
