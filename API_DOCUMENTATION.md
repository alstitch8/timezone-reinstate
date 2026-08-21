# TIMEZONE Reinstatement API Documentation

## Overview

This API provides health checks and employee resignation/reinstatement actions against the TIMEZONE system.

Default local base URL:

```text
http://localhost:3060
```

Production base URL depends on the deployed server/domain.

## Authentication

Protected endpoints require a Bearer token in the `Authorization` header.

```http
Authorization: Bearer <API_AUTH_TOKEN>
```

The server reads the expected token from one of these environment variables:

- `API_AUTH_TOKEN`
- `API_KEY`

Health endpoints do not require authentication.

## Content Type

Requests with bodies must use JSON.

```http
Content-Type: application/json
```

## Endpoints

| Method | Path | Auth Required | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Checks that the API process is running. |
| `GET` | `/health/db` | No | Checks that the API can connect to PostgreSQL. |
| `POST` | `/api/employees` | Yes | Gets one, many, or all employees from PostgreSQL. |
| `POST` | `/api/resign` | Yes | Resigns one or more employees in TIMEZONE. |
| `POST` | `/api/reinstate` | Yes | Reinstates one or more employees in TIMEZONE. |

## GET /health

Checks whether the API service is running.

### Example Request

```bash
curl http://localhost:3060/health
```

### Success Response

Status: `200 OK`

```json
{
  "success": true,
  "service": "timezone-api"
}
```

## GET /health/db

Checks whether the API can connect to the configured PostgreSQL database.

### Example Request

```bash
curl http://localhost:3060/health/db
```

### Success Response

Status: `200 OK`

```json
{
  "success": true,
  "service": "timezone-api",
  "database": "connected",
  "check": {
    "ok": 1
  }
}
```

### Possible Error Response

Status: `500 Internal Server Error`

```json
{
  "success": false,
  "message": "Missing required database environment variable: PG_HOST"
}
```

## POST /api/employees

Gets employee records from PostgreSQL. This endpoint supports a single employee ID, multiple employee IDs, or all employees.

### Authentication

Required.

```http
Authorization: Bearer <API_AUTH_TOKEN>
```

### Single Request Body

```json
{
  "employeeId": "13404671"
}
```

### Multiple Request Body

```json
{
  "employeeIds": ["13404671", "12345"]
}
```

### All Employees Request Body

```json
{
  "all": true
}
```

### Response Fields

| Field | Description |
| --- | --- |
| `id` | Database ID from `personnel_employee.id`. |
| `first_name` | Employee first name. |
| `last_name` | Employee last name. |
| `employeeid` | Employee code from `personnel_employee.emp_code`. |

### Single Example Request

```bash
curl -X POST http://localhost:3060/api/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -d '{
    "employeeId": "13404671"
  }'
```

### Single Success Response

Status: `200 OK`

```json
{
  "success": true,
  "employee": {
    "id": 1,
    "first_name": "Jane",
    "last_name": "Doe",
    "employeeid": "13404671"
  }
}
```

### Single Not Found Response

Status: `404 Not Found`

```json
{
  "success": false,
  "message": "employee not found"
}
```

### Multiple Response

Status: `200 OK` when all employees are found.
Status: `207 Multi-Status` when one or more employees are not found.

```json
{
  "success": false,
  "total": 2,
  "successCount": 1,
  "failedCount": 1,
  "results": [
    {
      "success": true,
      "employee": {
        "id": 1,
        "first_name": "Jane",
        "last_name": "Doe",
        "employeeid": "13404671"
      }
    },
    {
      "success": false,
      "employeeId": "12345",
      "message": "employee not found"
    }
  ]
}
```

### All Employees Response

Status: `200 OK`

```json
{
  "success": true,
  "total": 1,
  "employees": [
    {
      "id": 1,
      "first_name": "Jane",
      "last_name": "Doe",
      "employeeid": "13404671"
    }
  ]
}
```

## POST /api/resign

Resigns an employee in TIMEZONE. This endpoint supports both single-item and batch requests.

### Authentication

Required.

```http
Authorization: Bearer <API_AUTH_TOKEN>
```

### Single Request Body

```json
{
  "employeeCode": "12345",
  "resignType": "1",
  "disableAtt": true,
  "resignReason": "test",
  "resignDate": "2026-08-19",
  "reportGenerationEndDate": "2026-08-19"
}
```

### Single Request Fields

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `employeeCode` | string or number | Yes | None | Employee code used to find the employee in TIMEZONE. |
| `resignType` | string | No | `"1"` | TIMEZONE resignation type value. |
| `disableAtt` | boolean or string | No | `"True"` | Attendance disable flag. Boolean `true` becomes `"True"`; boolean `false` becomes `"False"`. |
| `resignReason` | string | No | `"test"` | Reason submitted to TIMEZONE. |
| `resignDate` | string | No | Current date | Must use `YYYY-MM-DD` format when provided. |
| `reportGenerationEndDate` | string | No | Same as `resignDate` | Must use `YYYY-MM-DD` format when provided. |

### Single Example Request

```bash
curl -X POST http://localhost:3060/api/resign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -d '{
    "employeeCode": "12345",
    "resignType": "1",
    "disableAtt": true,
    "resignReason": "test",
    "resignDate": "2026-08-19",
    "reportGenerationEndDate": "2026-08-19"
  }'
```

### Single Success Response

Status: `200 OK`

```json
{
  "success": true,
  "employee": {
    "employeeCode": "12345",
    "id": "employee-timezone-id"
  },
  "input": {
    "resignDate": "2026-08-19",
    "resignType": "1",
    "reportGenerationEndDate": "2026-08-19",
    "disableAtt": "True",
    "resignReason": "test"
  },
  "timezoneResponse": {}
}
```

`timezoneResponse` contains the raw response returned by TIMEZONE.

### Batch Request Body

Send an array of resignation payloads.

```json
[
  {
    "employeeCode": "12345",
    "resignDate": "2026-08-19"
  },
  {
    "employeeCode": "67890",
    "resignType": "1",
    "disableAtt": false,
    "resignReason": "resigned"
  }
]
```

### Batch Success Response

Status: `200 OK` when all items succeed.

```json
{
  "success": true,
  "total": 2,
  "successCount": 2,
  "failedCount": 0,
  "results": [
    {
      "success": true,
      "employee": {
        "employeeCode": "12345",
        "id": "employee-timezone-id"
      },
      "input": {
        "resignDate": "2026-08-19",
        "resignType": "1",
        "reportGenerationEndDate": "2026-08-19",
        "disableAtt": "True",
        "resignReason": "test"
      },
      "timezoneResponse": {}
    }
  ]
}
```

Status: `207 Multi-Status` when one or more items fail.

```json
{
  "success": false,
  "total": 2,
  "successCount": 1,
  "failedCount": 1,
  "results": [
    {
      "success": false,
      "employeeCode": "67890",
      "message": "Employee not found"
    }
  ]
}
```

## POST /api/reinstate

Reinstates an employee in TIMEZONE. This endpoint supports both single-item and batch requests.

The API looks up the latest resignation record for the employee in PostgreSQL before calling TIMEZONE.

### Authentication

Required.

```http
Authorization: Bearer <API_AUTH_TOKEN>
```

### Single Request Body

```json
{
  "employeeId": "12345"
}
```

### Single Request Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `employeeId` | string or number | Yes | Numeric employee identifier. Must contain digits only. |

### Single Example Request

```bash
curl -X POST http://localhost:3060/api/reinstate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_AUTH_TOKEN>" \
  -d '{
    "employeeId": "12345"
  }'
```

### Single Success Response

Status: `200 OK`

```json
{
  "success": true,
  "employeeId": "12345",
  "resignId": "98765",
  "timezoneResponse": {}
}
```

`timezoneResponse` contains the raw response returned by TIMEZONE.

### Batch Request Body

Send an array of reinstate payloads.

```json
[
  {
    "employeeId": "12345"
  },
  {
    "employeeId": "67890"
  }
]
```

### Batch Success Response

Status: `200 OK` when all items succeed.

```json
{
  "success": true,
  "total": 2,
  "successCount": 2,
  "failedCount": 0,
  "results": [
    {
      "success": true,
      "employeeId": "12345",
      "resignId": "98765",
      "ssnTemporarilyCleared": true,
      "timezoneResponse": {}
    }
  ]
}
```

Status: `207 Multi-Status` when one or more items fail.

```json
{
  "success": false,
  "total": 2,
  "successCount": 1,
  "failedCount": 1,
  "results": [
    {
      "success": false,
      "employeeId": "67890",
      "message": "employee does not exist"
    }
  ]
}
```

## Common Error Responses

### Missing or Invalid Bearer Token

Status: `401 Unauthorized`

```json
{
  "success": false,
  "message": "Missing or invalid Authorization Bearer token"
}
```

### Unauthorized Token

Status: `401 Unauthorized`

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### API Authentication Not Configured

Status: `500 Internal Server Error`

```json
{
  "success": false,
  "message": "API authentication is not configured"
}
```

### Validation Failed

Status: `400 Bad Request`

```json
{
  "success": false,
  "message": "Validation failed",
  "details": [
    "item: employeeCode is required"
  ]
}
```

### Endpoint Not Found

Status: `404 Not Found`

```json
{
  "success": false,
  "message": "Endpoint not found"
}
```

### TIMEZONE Request Failed

Status: depends on TIMEZONE response, or `500 Internal Server Error`.

```json
{
  "success": false,
  "message": "TIMEZONE request failed",
  "details": {}
}
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | API port. Defaults to `3060`. |
| `TIMEZONE_URL` | Yes | Base URL for the TIMEZONE system. |
| `TIMEZONE_LOGIN_PATH` | No | Login path for TIMEZONE. Defaults to `/login/`. |
| `API_AUTH_TOKEN` | Yes for protected endpoints | Bearer token expected by the API. |
| `API_KEY` | Alternative | Fallback token name when `API_AUTH_TOKEN` is not set. |
| `PG_HOST` | Yes for DB-backed endpoints | PostgreSQL host. |
| `PG_PORT` | No | PostgreSQL port. Defaults to `5432`. |
| `PG_USER` | Yes for DB-backed endpoints | PostgreSQL user. |
| `PG_PASSWORD` | Yes for DB-backed endpoints | PostgreSQL password. |
| `PG_DATABASE` | Yes for DB-backed endpoints | PostgreSQL database name. |
| `PG_SSL` | No | Set to `true` to enable SSL with `rejectUnauthorized: false`. |

## Notes

- `/api/reinstate` requires PostgreSQL because it reads the latest resignation record before calling TIMEZONE.
- `/api/resign` calls TIMEZONE directly and does not use PostgreSQL.
- Batch endpoints continue processing after item-level failures and return per-item results.
- Date values must use `YYYY-MM-DD` format.