# FinGuard — Banking Transaction Monitoring System

A portfolio/demo banking simulation built with Java 25, Spring Boot, PostgreSQL, React, and Vite.
**This is a learning project only. It does not connect to real banks or handle real money.**

## Features
- Create and list customer accounts
- Deposit and withdraw funds
- Transfer funds between accounts
- Transaction history
- Database transactions for transfer consistency
- Transfer idempotency via `Idempotency-Key`
- Rule-based transaction alerts for large transfers and repeated transfers
- Dashboard UI with account balances, transfers, and alerts
- Input validation and centralized error responses

## Requirements
- JDK 25
- Maven 3.6.3+
- PostgreSQL 14+
- Node.js 20+ and npm

Spring Boot 3.5.16 supports Java 25. See the official system requirements:
https://docs.spring.io/spring-boot/3.5/system-requirements.html

## 1. Create PostgreSQL database
Open pgAdmin or psql and run:
```sql
CREATE DATABASE finguard;
```

## 2. Configure database credentials
Set environment variables before running the backend, or edit `backend/src/main/resources/application.properties`.

Windows PowerShell:
```powershell
$env:DB_URL="jdbc:postgresql://localhost:5432/finguard"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="your_postgres_password"
```

macOS/Linux:
```bash
export DB_URL=jdbc:postgresql://localhost:5432/finguard
export DB_USERNAME=postgres
export DB_PASSWORD='your_postgres_password'
```

## 3. Run backend
From the project folder:
```bash
cd backend
mvn spring-boot:run
```
Backend: http://localhost:8080
Health endpoint: http://localhost:8080/api/health

If Maven is not installed, import the `backend` folder as an Existing Maven Project in Eclipse. Set the project JRE to JDK 25, then run `FinGuardApplication.java`.

## 4. Run frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the URL printed by Vite, usually http://localhost:5173.

## API quick reference
- `GET /api/health`
- `GET /api/accounts`
- `POST /api/accounts` — create account
- `GET /api/accounts/{id}`
- `POST /api/accounts/{id}/deposit`
- `POST /api/accounts/{id}/withdraw`
- `POST /api/transfers` — include `Idempotency-Key` header
- `GET /api/transactions`
- `GET /api/alerts`
- `PATCH /api/alerts/{id}/review`

Example create account:
```json
{
  "customerName": "Aarav Sharma",
  "email": "aarav@example.com"
}
```

Example deposit/withdraw:
```json
{ "amount": 1000.00, "description": "Initial deposit" }
```

Example transfer:
```json
{
  "fromAccountId": 1,
  "toAccountId": 2,
  "amount": 250.00,
  "description": "Rent payment"
}
```

## Important notes
- The database schema is created/updated automatically by Hibernate for local learning (`ddl-auto=update`).
- The initial balance is zero. Create two accounts, then deposit funds before transferring.
- Monitoring thresholds are demo rules, not a real fraud detection system.
- For production use, this project would need stronger security, audit controls, secrets management, reconciliation, and a formal threat model.
