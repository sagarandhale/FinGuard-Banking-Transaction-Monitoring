package com.finguard.service;

import com.finguard.dto.*;
import com.finguard.model.*;
import com.finguard.repository.*;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class FinGuardService {
    private final BankAccountRepository accountRepository;
    private final BankTransactionRepository transactionRepository;
    private final TransactionAlertRepository alertRepository;
    private final BigDecimal largeTransferThreshold;
    private final int repeatedWindowMinutes;
    private final SecureRandom random = new SecureRandom();

    public FinGuardService(BankAccountRepository accountRepository,
                           BankTransactionRepository transactionRepository,
                           TransactionAlertRepository alertRepository,
                           @Value("${finguard.monitoring.large-transfer-threshold:5000.00}") BigDecimal largeTransferThreshold,
                           @Value("${finguard.monitoring.repeated-transfer-window-minutes:10}") int repeatedWindowMinutes) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.alertRepository = alertRepository;
        this.largeTransferThreshold = largeTransferThreshold;
        this.repeatedWindowMinutes = repeatedWindowMinutes;
    }

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (accountRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("An account already exists for this email.");
        }
        String accountNumber = generateAccountNumber();
        BankAccount account = accountRepository.save(new BankAccount(
                accountNumber, request.customerName().trim(), email));
        return AccountResponse.from(account);
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> listAccounts() {
        return accountRepository.findAll().stream().map(AccountResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccount(Long id) {
        return AccountResponse.from(findAccount(id));
    }

    @Transactional
    public TransactionResponse deposit(Long accountId, MoneyRequest request) {
        BankAccount account = accountRepository.findByIdForUpdate(accountId)
                .orElseThrow(() -> new EntityNotFoundException("Account " + accountId + " was not found."));
        account.setBalance(account.getBalance().add(request.amount()));
        BankTransaction transaction = transactionRepository.save(new BankTransaction(
                "DEPOSIT", null, account, request.amount(), "SUCCESS",
                defaultDescription(request.description(), "Cash deposit"), null));
        return TransactionResponse.from(transaction);
    }

    @Transactional
    public TransactionResponse withdraw(Long accountId, MoneyRequest request) {
        BankAccount account = accountRepository.findByIdForUpdate(accountId)
                .orElseThrow(() -> new EntityNotFoundException("Account " + accountId + " was not found."));
        ensureSufficientFunds(account, request.amount());
        account.setBalance(account.getBalance().subtract(request.amount()));
        BankTransaction transaction = transactionRepository.save(new BankTransaction(
                "WITHDRAWAL", account, null, request.amount(), "SUCCESS",
                defaultDescription(request.description(), "Cash withdrawal"), null));
        return TransactionResponse.from(transaction);
    }

    @Transactional
    public TransactionResponse transfer(TransferRequest request, String idempotencyKey) {
        if (request.fromAccountId().equals(request.toAccountId())) {
            throw new IllegalArgumentException("Source and destination accounts must be different.");
        }
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key header is required.");
        }
        String key = idempotencyKey.trim();
        if (key.length() > 100) {
            throw new IllegalArgumentException("Idempotency-Key must be 100 characters or fewer.");
        }

        var existing = transactionRepository.findByIdempotencyKey(key);
        if (existing.isPresent()) {
            BankTransaction old = existing.get();
            if (!old.getType().equals("TRANSFER")
                    || !old.getFromAccount().getId().equals(request.fromAccountId())
                    || !old.getToAccount().getId().equals(request.toAccountId())
                    || old.getAmount().compareTo(request.amount()) != 0) {
                throw new IllegalArgumentException("This Idempotency-Key was already used for a different request.");
            }
            return TransactionResponse.from(old);
        }

        // Lock account rows in deterministic ID order to reduce deadlock risk.
        Long firstId = Math.min(request.fromAccountId(), request.toAccountId());
        Long secondId = Math.max(request.fromAccountId(), request.toAccountId());
        BankAccount first = accountRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new EntityNotFoundException("Account " + firstId + " was not found."));
        BankAccount second = accountRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new EntityNotFoundException("Account " + secondId + " was not found."));
        BankAccount from = first.getId().equals(request.fromAccountId()) ? first : second;
        BankAccount to = first.getId().equals(request.toAccountId()) ? first : second;

        ensureSufficientFunds(from, request.amount());
        from.setBalance(from.getBalance().subtract(request.amount()));
        to.setBalance(to.getBalance().add(request.amount()));

        BankTransaction tx = transactionRepository.save(new BankTransaction(
                "TRANSFER", from, to, request.amount(), "SUCCESS",
                defaultDescription(request.description(), "Account transfer"), key));
        transactionRepository.flush();
        evaluateMonitoringRules(tx);
        return TransactionResponse.from(tx);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> listTransactions() {
        return transactionRepository.findTop100ByOrderByCreatedAtDesc().stream()
                .map(TransactionResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<AlertResponse> listAlerts() {
        return alertRepository.findTop100ByOrderByCreatedAtDesc().stream()
                .map(AlertResponse::from).toList();
    }

    @Transactional
    public AlertResponse reviewAlert(Long alertId, ReviewAlertRequest request) {
        TransactionAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new EntityNotFoundException("Alert " + alertId + " was not found."));
        alert.review(request.note() == null ? "" : request.note().trim());
        return AlertResponse.from(alert);
    }

    @Transactional(readOnly = true)
    public long accountCount() {
        return accountRepository.count();
    }

    private void evaluateMonitoringRules(BankTransaction tx) {
        if (tx.getAmount().compareTo(largeTransferThreshold) >= 0) {
            alertRepository.save(new TransactionAlert(tx, "LARGE_TRANSFER",
                    "Transfer meets or exceeds the configured monitoring threshold."));
        }
        LocalDateTime since = LocalDateTime.now().minusMinutes(repeatedWindowMinutes);
        List<BankTransaction> recent = transactionRepository
                .findByFromAccountIdAndCreatedAtAfterAndTypeOrderByCreatedAtDesc(
                        tx.getFromAccount().getId(), since, "TRANSFER");
        long matchingRecent = recent.stream()
                .filter(t -> !t.getId().equals(tx.getId()))
                .filter(t -> t.getToAccount() != null && t.getToAccount().getId().equals(tx.getToAccount().getId()))
                .filter(t -> t.getAmount().compareTo(tx.getAmount()) == 0)
                .count();
        if (matchingRecent >= 1) {
            alertRepository.save(new TransactionAlert(tx, "REPEATED_TRANSFER",
                    "A matching transfer to the same destination occurred within the configured time window."));
        }
    }

    private BankAccount findAccount(Long id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Account " + id + " was not found."));
    }

    private void ensureSufficientFunds(BankAccount account, BigDecimal amount) {
        if (account.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient funds. Available balance: " + account.getBalance());
        }
    }

    private String generateAccountNumber() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String candidate = "FG" + String.format("%010d", random.nextInt(1_000_000_000));
            boolean exists = accountRepository.findAll().stream()
                    .anyMatch(a -> a.getAccountNumber().equals(candidate));
            if (!exists) return candidate;
        }
        throw new IllegalStateException("Could not generate a unique account number. Try again.");
    }

    private String defaultDescription(String provided, String fallback) {
        return provided == null || provided.isBlank() ? fallback : provided.trim();
    }
}
