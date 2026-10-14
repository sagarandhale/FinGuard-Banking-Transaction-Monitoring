package com.finguard.controller;

import com.finguard.dto.*;
import com.finguard.service.FinGuardService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FinGuardController {
    private final FinGuardService service;

    public FinGuardController(FinGuardService service) {
        this.service = service;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "UP", "application", "FinGuard", "demo", true);
    }

    @GetMapping("/accounts")
    public List<AccountResponse> accounts() {
        return service.listAccounts();
    }

    @PostMapping("/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse createAccount(@Valid @RequestBody CreateAccountRequest request) {
        return service.createAccount(request);
    }

    @GetMapping("/accounts/{id}")
    public AccountResponse account(@PathVariable Long id) {
        return service.getAccount(id);
    }

    @PostMapping("/accounts/{id}/deposit")
    public TransactionResponse deposit(@PathVariable Long id, @Valid @RequestBody MoneyRequest request) {
        return service.deposit(id, request);
    }

    @PostMapping("/accounts/{id}/withdraw")
    public TransactionResponse withdraw(@PathVariable Long id, @Valid @RequestBody MoneyRequest request) {
        return service.withdraw(id, request);
    }

    @PostMapping("/transfers")
    public TransactionResponse transfer(@RequestHeader(name = "Idempotency-Key", required = false) String key,
                                        @Valid @RequestBody TransferRequest request) {
        return service.transfer(request, key);
    }

    @GetMapping("/transactions")
    public List<TransactionResponse> transactions() {
        return service.listTransactions();
    }

    @GetMapping("/alerts")
    public List<AlertResponse> alerts() {
        return service.listAlerts();
    }

    @PatchMapping("/alerts/{id}/review")
    public AlertResponse reviewAlert(@PathVariable Long id,
                                     @Valid @RequestBody(required = false) ReviewAlertRequest request) {
        return service.reviewAlert(id, request == null ? new ReviewAlertRequest("") : request);
    }
}
