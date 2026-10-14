---
title: "Designing a Distributed Rate Limiter at Scale"
summary: "Architecting a low-latency token bucket rate limiter using Redis and Lua scripting to protect downstream microservices from traffic spikes."
category: "system-design"
tags: ["Distributed systems", "Redis", "Architecture"]
date: "2026-10-12T10:00:00Z"
featured: true
---

## The Problem

As user traffic scales, downstream services become vulnerable to sudden spikes, scraping bots, and accidental DDoS conditions from misconfigured client retries. We need a centralized rate limiter that can enforce API quotas globally with minimal latency overhead.

## Requirements

### Functional Requirements
* Enforce strict request limits per user ID or IP address (e.g., 100 requests per minute).
* Return standard HTTP `429 Too Many Requests` status codes when limits are exceeded.

### Non-Functional Requirements
* **Low Latency:** The rate-limiting check must add less than 5ms to the request lifecycle.
* **High Availability:** If the rate-limiting cluster fails, it should fail-open rather than block user traffic.
* **Accuracy:** Distributed nodes must share state accurately to prevent race conditions during concurrent requests.

---

## Core Algorithm: Token Bucket

We chose the **Token Bucket** algorithm over fixed windows because it allows for short bursts of traffic while smoothing out sustained high-volume loads.

```lua
-- Redis Lua Script for Atomic Token Bucket Check
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current_time = tonumber(ARGV[2])
local refill_rate = tonumber(ARGV[3]) -- tokens per second
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_updated')
local tokens = tonumber(bucket[1])
local last_updated = tonumber(bucket[2])

if not tokens then
    tokens = limit
    last_updated = current_time
else
    local elapsed = math.max(0, current_time - last_updated)
    tokens = math.min(limit, tokens + (elapsed * refill_rate))
    last_updated = current_time
end

if tokens >= requested then
    tokens = tokens - requested
    redis.call('HMSET', key, 'tokens', tokens, 'last_updated', last_updated)
    redis.call('EXPIRE', key, math.ceil(limit / refill_rate))
    return 1
else
    return 0
end