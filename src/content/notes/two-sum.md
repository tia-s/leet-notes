---
title: Two Sum, and the case for a hash map
summary: Starting with the obvious solution, then finding the one small insight that changes everything.
category: algorithm
tags: [Arrays, Hash maps]
date: 2026-10-10
featured: true
---

## The Problem

Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.

## Approach 1: Brute Force

The initial instinct is often to check every possible pair using nested loops.

```typescript
function twoSum(nums: number[], target: number): number[] {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) {
                return [i, j];
            }
        }
    }
    return [];
}