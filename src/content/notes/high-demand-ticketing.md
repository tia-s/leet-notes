---
title: "Flash Sale Ticketing System"
summary: "Design a high-throughput ticketing system that prevents overselling under extreme concurrent demand."
category: "system-design"
tags: [Concurrency, Redis, Kafka, Relational Database, PostgreSQL, Idempotency, Backpressure]
date: "2026-10-24T11:24:23Z"
featured: true
---

## Problem Statement

Design a flash sale ticketing system to sell 50,000 tickets to 500,000 concurrent users.

## The Challenge

Handling 500,000 concurrent users competing for 50,000 seats creates a massive spike in traffic ($10\times$ demand over supply). This creates a write-heavy concurrency problem as standard relational database transactions will collapse under lock contention if hundreds of thousands of requests hit the same rows simultaneously.

The system must:
- prevent overselling
- handle retries
- handle reservation time-out
- handle duplicate requests 

The platform must prioritize consistency over availability for inventory state. If multiple users are allowed to reserve the same seat or users are double-charged, trust in the business is immediately lost, which is why preventing ticket overselling is critical. This makes strict ACID (Atomicity, Consistency, Isolation, Durability) behaviour non-negotiable for final inventory decisions, guaranteeing that a finalized order cannot end up half-saved or corrupted.

To shield the primary database from catastrophic lock contention, we can split the workflow into three distinct phases:

### Traffic Shedding & Rate Limiting
We need to handle invalid requests through the **API Gateway** to ensure cross-cutting concerns such as authentication, SSL termination, request routing, and rate limiting, do not reach core application services. This prevents unnecessary resource exhaustion and reduces attack surfaces. In this way, we are able to drop excess traffic and filter out duplicate requests early.

### In-Memory Reservation & Stock Control
Relational databases such as PostgreSQL and MySQL are disk-bound and limited by I/O speeds. If 500k users execute `UPDATE tickets SET status = 'RESERVED' WHERE status = 'AVAILABLE' LIMIT 1;` directly on an RDBMS, database row-level/table-level locks will cause connection pool exhaustion, CPU spikes, and cascading failures within seconds. The database would spend most of its CPU time managing lock queues instead of processing writes.

On the other hand, **Redis** stores data in memory, offering read and write operations in single-digit milliseconds. It processes requests sequentially on an event loop, allowing custom Lua scripts to evaluate stock conditions and decrement inventory as an unbroken, atomic operation. This guarantees that race conditions are eliminated without heavy database locks, preventing overselling and duplicate reservations. 

However, since a single Redis node means a single point of failure, a Redis Cluster with primary-replica nodes would ensure high availability and automatic failover. A clustered setup also allows keys to be sharded across nodes to distribute memory and network throughput load across the cluster. Redis also natively manages reservation timeouts using Key Expiration (TTL).

### Asynchronous Order Processing & Payment 
If 50,000 users successfully claim a reservation within 3 seconds, downstream systems such as payment processors, invoice generators, and transactional email services, will crash if called synchronously. 

Kafka acts as a shock absorber by queuing order payloads. Downstream worker services then pull and process these orders asynchronously at a controlled, sustainable rate. Kafka writes sequentially to an append-only log on disk, enabling it to process high-throughput event streams with durability. If a downstream service or payment gateway experiences a temporary outage, messages remain safely stored in Kafka to be reprocessed when the system recovers, ensuring reliable retries. By default, Kafka employs time-based retention to keep disk usage bounded.

## Proposed Architecture

```text
[1. Client Click] 
      │
      ▼
[2. API Gateway] ──(Rate limited / Blocked)──► [429 / 410 Fast Fail Response]
      │
      ▼ (Valid Traffic)
[3. Flash Sale Service] ──(1. Send Lua Script)──► [4. Redis Cluster]
      │                                                │
      │◄─────(2. Return Result: Success/Fail)──────────┤
      │                                                │ (Sold Out / Duplicate)
      │                                                ▼
      │                                 [Reject / Cached Status]
      │
      ▼ (Stock Decremented & Seat Reserved)
[5. Kafka Message Queue]
      │
      ▼ (Async Pull)
[6. Downstream Worker Services] ──► [Payment Gateway]
      │                                  │
      │ (Persist Order)                  ▼
      ▼                           [7. Payment Success / Fail]
[8. PostgreSQL / MySQL DB] ◄────────────────┘
```

### Step 1: API Gateway
1. **User Request:** A user clicks "Buy Ticket", generating a request containing their `user_id`, `event_id`, and a client-generated `uuid`.
2. **Edge Filtering:** The _API Gateway_ handles initial edge checks (SSL termination, JWT authentication, and DDoS protection). 
3. **Traffic Shedding:** Using token bucket rate-limiting algorithms, excess traffic (spammed requests or bot spikes) is dropped immediately with `429 Too Many Requests` or `410 Sold Out` responses before reaching core backend services.

### Step 2: Flash Sale Service & Redis Cluster
1. **Lua Execution:** Valid requests are forwarded to the _Flash Sale Service_, which passes request parameters (`user_id`, `event_id`, `ttl=600`) into an atomic Lua script executed on the _Redis Cluster_.
2. **Single Atomic Operation:** The Lua script evaluates the following directly inside _Redis_ memory:
   * **Deduplication Check:** Checks if a reservation key for this user already exists (`EXISTS event:<id>:user:<id>`). If it exists, the script aborts and returns a duplicate status code immediately without touching inventory.
   * **Stock Check & Reservation:** Checks remaining inventory (`GET event:<id>:stock > 0`). If stock is available, it decrements the counter (`DECR`) and creates the user's temporary reservation key with a 10-minute TTL (`SET event:<id>:user:<id> "RESERVED" EX 600`) within the same unbroken execution.
3. **Immediate User Feedback:** The _Flash Sale Service_ evaluates the return code from _Redis_:
   * **Success (`1`):** Returns `202 Accepted` with a checkout reservation token.
   * **Sold Out (`-1`):** Returns `410 Sold Out`.
   * **Duplicate (`-2`):** Returns `409 Conflict` (or returns the cached reservation status).

### Step 3: Kafka
1. **Event Publishing:** Upon a successful _Redis_ reservation, the _Flash Sale Service_ publishes an `OrderCreated` event to an _Apache Kafka_ topic.
2. **Shock Absorption:** Kafka safely buffers the high-volume event stream to disk in sequential, append-only logs, decoupling the instant reservation spike from slower downstream payment and database operations.

### Step 4: Downstream Services
1. **Controlled Consumption:** The Order Service (acting as a Kafka consumer) pulls order events from Kafka topics at a sustainable, controlled processing rate.
2. **Payment Processing:** The user is directed to complete checkout. The Order Service communicates with external _Payment Gateways_.

### Step 5: Relational Database
1. **ACID Persistence:** Once payment clears, the transaction is written to PostgreSQL (acting as the primary _Relational Database_), setting the order status to `CONFIRMED` with strict ACID guarantees.
2. **Handling Timeouts / Cancellations:**
   * **If Payment Succeeds:** The _Redis_ reservation key is updated to `PAID` or removed.
   * **If 10 Minutes Expire / Payment Fails:** The Redis TTL expires (or an explicit cancellation triggers), and a background process increments the stock counter in Redis (`INCR stock`), making the seat available to other buyers.

```md
# RFC: Flash Sale Ticketing System 
**Date:** 2026-10-24  
**Status:** Draft

## Context & Scope
- **Background:** The legacy ticketing architecture processes inventory deductions through synchronous database locks. During high-demand events, this causes lock contention, query timeouts, and occasional overselling.
- **Goals:**
  * Process 50,000 ticket reservations in under 5 minutes without database degradation.
  * Guarantee zero oversold tickets under maximum load.
- **Non-Goals:** This design excludes seat-map rendering and per-seat selection. It only handles aggregate section-level inventory.

## Requirements
- **Functional:** Users can view events, request a 10-minute ticket hold, and complete purchases within the hold window.
- **Availability:** 99.9% overall target. During peak spikes, excess traffic is intentionally shed at the edge to protect backend infrastructure and maintain inventory consistency.
- **Durability:** Zero lost orders once payment confirmation is recorded.
- **Consistency:** Strong consistency is required for inventory counts and read-your-writes semantics for order history.
- **Latency & Throughput:** Ticket hold requests must return in p95 < 200ms.

## Capacity & Scale Expectations
- **Traffic/Users:** Peak load is 500,000 concurrent users hitting the reservation endpoint simultaneously for 50,000 seats.
- **Read/Write Ratio:** Normally 100:1; during flash sales it becomes 1:1.
- **Data Volume:** 10M users, 1M orders per month.

## Proposed Architecture
- **High-Level Design:**
  1. Static event metadata is served from the CDN.
  2. **Traffic Shedding & Edge Filtering:** The API Gateway receives traffic, applies token bucket rate limiting, filters duplicate requests, and immediately rejects excess/bot traffic (returning `429` or `410`).
  3. **Atomic In-Memory Reservation:** The Flash Sale Service executes a single atomic Lua script on a Redis Cluster. This script verifies the user hasn't already reserved a ticket, checks remaining stock, decrements inventory, and sets a 10-minute reservation TTL (`EX 600`).
  4. **Asynchronous Order Processing:** On successful Redis reservation, the service publishes an `OrderCreated` event to an Apache Kafka topic to decouple the instant traffic spike from downstream systems.
  5. **Controlled Persistence:** Downstream worker services consume Kafka events sequentially at a sustainable rate, inserting pending orders into PostgreSQL.
  6. **Payment & Timeout Finalization:** Successful payment updates the order in PostgreSQL. If the 10-minute window expires without payment, the Redis TTL expires, and a background worker replenishes the Redis stock counter.
- **Core Components:** API Gateway, Redis Cluster, Kafka, PostgreSQL.

## System Interface
- **Endpoints:**
  * `POST /v1/reservations`
    * *Headers:* `Idempotency-Key: <uuid>`
    * *Payload:* `{ "event_id": "123", "ticket_tier": "GA", "quantity": 1 }`
    * *Response:* `202 Accepted` with `reservation_id` and `expires_at`, `410 Sold Out` if sold out, or `409 Conflict` (or cached status) for duplicate account requests.

## Data Design
- **Storage Choices:** PostgreSQL for ACID compliance on financial orders; Redis Cluster for in-memory stock control and deduplication.
- **Schema:**
  * `Events` (`id`, `name`, `total_capacity`)
  * `Orders` (`id`, `user_id`, `event_id`, `status`, `created_at`)
- **Indexes:** B-tree index on `Orders(user_id)`.

## Scaling Strategy
- **Edge Filtering:** API Gateway absorbs the $10\times$ traffic spike before it hits compute services.
- **Caching:** Event metadata is cached at the edge.
- **Async Work:** Database writes are decoupled from the request cycle through Kafka, preventing connection pool exhaustion.
- **Bottlenecks:** The Redis partition holding the event inventory is the primary bottleneck, mitigated by using a Redis Cluster to distribute memory and network throughput.

## Consistency & Concurrency
- **Conflict Handling:** Race conditions and overselling are eliminated by evaluating stock and deduplication natively within a single-threaded Redis Lua script.
- **Idempotency:** All reservation requests require a client-generated idempotency key (uuid) to prevent double-charging on network retries.
- **Transactions:** A TTL expiration event compensates abandoned checkouts by restoring inventory in Redis and marking the order expired in PostgreSQL.

## Alternatives Considered
- **Alternative 1: Direct PostgreSQL `SELECT FOR UPDATE`**
  * Rejected because lock contention will cause CPU spikes and cascading failures under the 500k QPS peak load.
- **Alternative 2: DynamoDB / NoSQL**
  * Rejected because the lack of native multi-table ACID guarantees risks data corruption and orphaned records unless slow, error-prone application-level locks are built.

## Dependencies & Integrations
- **Third-Party APIs:** Stripe handles payments. If Stripe slows down, ticket holds must be extended.

## Operational Considerations
- **Observability:** Kafka consumer lag and Redis memory usage are primary health metrics.
- **Graceful Degradation:** Redis and Kafka continue to operate during PostgreSQL or payment gateway outages, buffering orders safely until downstream systems recover.

## Rollout, Migration & Rollback
- **Deployment Strategy:** The async design is dark-launched beside the legacy architecture to validate performance and stability under real traffic before full rollout.
- **Rollback Plan:** A feature flag routes writes back to the legacy synchronous logic if anomalies are detected.

## Testing Strategy
- **Load Testing:** Use Locust to simulate 500,000 concurrent reservation requests targeting a single event stock key.
- **Failure Testing:** Terminate a PostgreSQL node while under load to verify Kafka message retention and seamless recovery.

## Risks & Open Questions
- **Risk:** Malicious actors hoarding reservation time windows to scalp inventory.
  * **Mitigation:** Strict rate limiting per IP/user ID at the API Gateway, enforcing Redis deduplication per account, and requiring CAPTCHA validation before reservation generation.
- **Risk:** Redis "Hot Key" bottleneck. Since  all 500,000 QPS target a single event's stock key, it forces all traffic onto a single Redis shard, potentially exceeding the node's single-threaded CPU limit (~100k ops/sec).
  * **Mitigation:** Implement a local in-memory flag in the Flash Sale Service that flips to `true` once Redis returns `-1` (Sold Out). This instantly sheds all subsequent traffic at the compute layer without hitting Redis.
- **Risk:** Kafka consumer lag exceeds the 10-minute Redis TTL. If downstream database writes or payment processing gets heavily delayed, the Redis reservation might expire and return the ticket to the pool while the user is actively entering their credit card.
  * **Mitigation:** Dynamically scale Kafka consumer workers based on topic lag. Alternatively, implement a "TTL Extension" heartbeat from the checkout page that extends the Redis lock while the user is actively typing.
- **Risk:** Partial failures (The "Zombie Reservation"). The Flash Sale Service executes the Redis Lua script successfully, but the service crashes or the network drops right before it can publish the `OrderCreated` event to Kafka.
  * **Mitigation:** The 10-minute TTL on the Redis reservation key naturally handles this. If the order never reaches Kafka and the database, the temporary Redis key silently expires and the inventory is freed.
- **Open Question:** How do we handle refunds or cancellations post-purchase? 
  * *Note:* Do we feed these back into a rolling inventory pool, or batch them for a secondary "second-chance" flash sale?
```

## Summary

This design modernizes the ticketing platform to safely handle extreme flash sale concurrency (500,000 QPS) without compromising data integrity. By migrating inventory management from synchronous PostgreSQL locks to atomic Redis Lua scripts, and decoupling downstream order processing via Kafka, the system eliminates database contention and guarantees zero oversold tickets. 

The resulting design is highly available, strictly consistent at the inventory layer, and ensures a stable user experience during peak demand.