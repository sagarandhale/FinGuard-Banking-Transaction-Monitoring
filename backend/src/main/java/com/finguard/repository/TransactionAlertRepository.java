package com.finguard.repository;

import com.finguard.model.TransactionAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransactionAlertRepository extends JpaRepository<TransactionAlert, Long> {
    List<TransactionAlert> findTop100ByOrderByCreatedAtDesc();
}
