# AuthOrchestrator

## Enterprise JWT Authentication & Session Lifecycle Management Framework

AuthOrchestrator is a robust authentication and session management framework designed for modern enterprise applications built with:

* **ASP.NET Core Web API**
* **Angular SPA**
* **JWT-based Authentication**
* **Refresh Token Security**
* **Reactive Session Management**

AuthOrchestrator coordinates the complete authentication lifecycle by managing user identity, token renewal, session expiration, and secure logout workflows.

The goal of this project is to provide a production-ready authentication architecture following enterprise software engineering practices:

* Clean Architecture
* SOLID Principles
* Secure Token Management
* Reactive Programming
* Scalable API Design

---

# Why AuthOrchestrator?

Modern enterprise applications require more than simple JWT authentication.

A complete authentication solution must handle:

* Expiring access tokens
* Long-lived refresh tokens
* User inactivity detection
* Session expiration warnings
* Multiple concurrent API requests
* Token refresh synchronization
* Secure logout and revocation

AuthOrchestrator acts as the central coordinator between the frontend application, backend APIs, and authentication infrastructure.

```
                Authentication Lifecycle

 Login
   |
   |
 Generate Tokens
   |
   |
 Monitor Session
   |
   |
 Refresh Tokens
   |
   |
 Validate Identity
   |
   |
 Logout Securely
```

---

# Architecture Overview

```
                         User
                          |
                          |
                  Angular SPA
                          |
        +-----------------+----------------+
        |                                  |
        |                                  |
IdleTimeoutService                 JwtInterceptor
        |                                  |
        |                                  |
Session Expiry Dialog             Token Management
        |                                  |
        +-----------------+----------------+
                          |
                          |
                  ASP.NET Core API
                          |
                JWT Authentication
                          |
          +---------------+---------------+
          |                               |
    Access Token                 Refresh Token
          |                               |
          +---------------+---------------+
                          |
                    Token Database
```

---

# Technology Stack

## Frontend

* Angular SPA
* Angular Material
* RxJS
* HTTP Interceptors
* Reactive Services
* TypeScript

## Backend

* ASP.NET Core Web API
* Entity Framework Core
* JWT Bearer Authentication
* Dependency Injection
* Clean Architecture

## Database

* SQL Server
* Refresh Token Persistence
* Session Tracking

---

# Core Features

## 1. Intelligent Idle Session Management

AuthOrchestrator provides centralized user inactivity monitoring across the Angular application.

Tracked events:

* Mouse movement
* Keyboard input
* Mouse clicks
* Scrolling
* Touch gestures
* Route navigation

---

## Idle Timeout Workflow

```
User Active
     |
     |
No User Activity
     |
     |
Idle Threshold Reached
     |
     |
Session Warning Dialog
     |
     |
10 Second Countdown
     |
     +----------------+
     |                |
Continue Session   Logout
     |                |
Reset Timer      Clear Tokens
     |                |
Continue App     Redirect Login
```

---

## Session Expiry Dialog

Example:

```
-----------------------------------
|                                 |
|  Your session is expiring       |
|                                 |
|  Your session is about to       |
|  expire due to inactivity.      |
|                                 |
|              00:10              |
|                                 |
| [Continue Session]   [Logout]   |
-----------------------------------
```

---

# 2. Automatic JWT Token Renewal

AuthOrchestrator automatically renews expired access tokens without interrupting user activity.

## Token Refresh Flow

```
API Request
      |
      |
Check Access Token
      |
      |
Token Valid?
      |
 +----+----+
 |         |
Yes        No
 |         |
Send    Refresh Token
Request     |
            |
      Generate New Token
            |
      |
 Retry Original Request
```

---

# Concurrent Request Handling

AuthOrchestrator prevents multiple refresh token calls when several API requests fail simultaneously.

Example:

```
Request A ----\
Request B -----\
Request C -------> Access Token Expired
Request D -----/

              |
              |
      Single Refresh Request
              |
              |
       New Access Token
              |
              |
       Retry All Requests
```

Benefits:

* No duplicate refresh requests
* Prevents race conditions
* Improves application performance
* Maintains consistent authentication state

---

# Angular Architecture

## AuthService

Responsibilities:

* Login
* Logout
* Authentication state management
* Current user information

## TokenService

Responsibilities:

* Store access token
* Store refresh token
* Validate expiration
* Replace expired tokens

## IdleTimeoutService

Responsibilities:

* Global activity tracking
* Idle timer management
* Session expiration detection

## SessionDialogService

Responsibilities:

* Open expiry dialog
* Countdown management
* Continue session handling

---

# HTTP Interceptor

## JwtInterceptor

Responsibilities:

* Attach JWT token to API requests
* Detect unauthorized responses
* Refresh expired tokens
* Retry failed requests
* Prevent infinite refresh loops

---

# Backend Authentication Design

## Access Token

Short-lived JWT token.

Recommended configuration:

```
Lifetime:
15 minutes

Contains:
- User Claims
- Roles
- Permissions
- Expiration
```

---

## Refresh Token

Long-lived secure token.

Features:

* Database persistence
* Token rotation
* Revocation support
* User/device association
* Expiration validation

---

# Refresh Token API

## Endpoint

```
POST /api/auth/refresh-token
```

Request:

```json
{
  "accessToken": "",
  "refreshToken": ""
}
```

Response:

```json
{
  "accessToken": "",
  "refreshToken": "",
  "expiresIn": "900"
}
```

---

# Security Features

AuthOrchestrator provides:

## Token Security

✔ Secure refresh token storage
✔ Refresh token rotation
✔ Token revocation
✔ Expiration validation
✔ Reuse detection

## Session Security

✔ Automatic logout
✔ Idle timeout protection
✔ Client state cleanup
✔ Browser tab synchronization
✔ Infinite refresh prevention

---

# Project Structure

```
AuthOrchestrator

├── Backend
│
├── AuthOrchestrator.API
├── AuthOrchestrator.Application
├── AuthOrchestrator.Domain
├── AuthOrchestrator.Infrastructure
│
├── Frontend
│
├── auth-orchestrator.angular
│
│   ├── services
│   ├── interceptors
│   ├── components
│   ├── guards
│   └── models
│
└── Tests
    |
    ├── UnitTests
    └── IntegrationTests
```

---

# Authentication Lifecycle

## Login

```
User Credentials
       |
       |
Validate User
       |
       |
Generate JWT Tokens
       |
       |
Start Session Monitoring
```

---

## Active Session

```
User Activity
       |
       |
Valid Token
       |
       |
API Communication
```

---

## Token Expiration

```
Access Token Expired
          |
          |
Interceptor Detects
          |
          |
Refresh Token Request
          |
          |
Generate New Tokens
          |
          |
Retry API Request
```

---

## Idle Timeout Logout

```
No Activity
     |
     |
Warning Dialog
     |
     |
Countdown Finished
     |
     |
Logout
     |
     |
Clear Authentication State
     |
     |
Redirect Login
```

---

# Engineering Principles

AuthOrchestrator follows:

* Clean Architecture
* SOLID Principles
* Dependency Injection
* Separation of Concerns
* Async Programming
* Reactive Programming
* Enterprise Security Practices

---

# Future Enhancements

Planned improvements:

* OAuth2 / OpenID Connect support
* Single Sign-On (SSO)
* Multi-device session management
* SignalR session synchronization
* Security audit logging
* Login activity tracking
* Device fingerprinting

---

# License

MIT License

---

# About

AuthOrchestrator is an enterprise-grade authentication lifecycle framework designed to simplify secure session management for Angular and ASP.NET Core applications.
