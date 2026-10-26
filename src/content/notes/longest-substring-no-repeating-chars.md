---
title: "Longest Substring Without Repeating Characters"
summary: "Find the length of the longest substring that contains no repeated characters."
category: "algorithm"
tags: ["Sliding Window"]
date: "2026-10-25T12:00:00Z"
featured: true
---

## LeetCode 3: Longest Substring Without Repeating Characters

Given a string `s`, find the length of the longest substring without repeating characters.

### Examples
* **Example 1:** `s = "abcabcbb"` → output: `3` (`"abc"`)
* **Example 2:** `s = "bbbbb"` → output: `1` (`"b"`)
* **Example 3:** `s = "pwwkew"` → output: `3` (`"wke"`)

### Constraints
* $0 \leq \text{s.length} \leq 5 \times 10^4$
* Target time complexity: $O(N)$.
* Target extra space complexity: $O(\min(N, M))$, where $M$ is the size of the character set.

---

Before choosing an approach, it helps to distinguish a **substring** from a **subsequence**:

* A **substring** must be contiguous. In `"pwwkew"`, `"wke"` is a valid substring.
* A **subsequence** can skip characters while maintaining their relative order. In `"pwwkew"`, `"pwke"` is a subsequence, but not a substring.

Since the problem asks for a substring, every window must consist of contiguous indices, such as `s[left:right + 1]`.

### Potential Solution 1: Brute force - $O(n^2)$ or $O(n^3)$ time

My first instinct is to pick a starting character and expand to the right until I encounter a repeated character, then repeat from the next starting index:

```
Start at index 0 ('a'): "abc" -> duplicate 'a' hit
Start at index 1 ('b'): "bca" -> duplicate 'b' hit
Start at index 2 ('c'): "cab" -> duplicate 'c' hit
...
```

Checking every possible start and end position requires a nested loop, resulting in $O(N^2)$ pairs. If each candidate substring is also scanned to check for duplicates, the total time can reach $O(N^3)$. The inner loop restarts for every starting index and rechecks overlapping work.

I quickly realized there's no need to create or store the full substring. Creating slices can require $O(N)$ extra space and time. Since we only need the length, we can keep a scalar such as `max_length = max(max_length, right - left + 1)` and use a set or map to track characters.

### Best pattern: Sliding window

The sliding-window pattern fits because we need to find the maximum length of a contiguous range that satisfies a condition: all its characters are unique.

1. Start `left` and `right` at index 0.
2. Move `right` forward one character at a time, adding each character to a lookup collection for the current window.
3. When a duplicate appears, shrink the window from the left until that duplicate is removed.
4. After each valid window, update `max_length`.

### Potential Solution 2: HashSet sliding window - $O(n)$ time; $O(\min(n, m))$ space

This solution moves `left` step by step in a `while` loop. Each character is visited at most twice: once by `right` and once by `left`.

```python
def lengthOfLongestSubstring_set(s: str) -> int:
    char_set = set()
    left = 0
    max_length = 0

    for right in range(len(s)):
        # Shrink the window until the duplicate is removed
        while s[right] in char_set:
            char_set.remove(s[left])
            left += 1

        # Add the current character and record the maximum window length
        char_set.add(s[right])
        max_length = max(max_length, right - left + 1)

    return max_length
```

### Trace walkthrough: `s = "pwwkew"`

```
Index:    0    1    2    3    4    5
Char:    'p'  'w'  'w'  'k'  'e'  'w'
```

* **`left = 0, right = 0` (`'p'`):** Window = `['p']`, set = `{'p'}`, `max_length = 1`.
* **`left = 0, right = 1` (`'w'`):** Window = `['p', 'w']`, set = `{'p', 'w'}`, `max_length = 2`.
* **`left = 0, right = 2` (`'w'`):** A duplicate `'w'` is found. Remove `s[0]` (`'p'`), making `left = 1`; the set still contains `{'w'}`. Remove `s[1]` (`'w'`), making `left = 2` and the set empty. Add the current `'w'`; the window is `['w']`, the set is `{'w'}`, and `max_length = 2`.
* **`left = 2, right = 3` (`'k'`):** Window = `['w', 'k']`, set = `{'w', 'k'}`, `max_length = 2`.
* **`left = 2, right = 4` (`'e'`):** Window = `['w', 'k', 'e']`, set = `{'w', 'k', 'e'}`, `max_length = 3`.
* **`left = 2, right = 5` (`'w'`):** A duplicate `'w'` is found. Shrink `left` past the previous `'w'` to index 3. The window is `['k', 'e', 'w']` and `max_length = 3`.

### Best Solution: HashMap last-seen index jump - $O(n)$ time; $O(\min(n, m))$ space

Instead of moving `left` one step at a time, store each character's last seen index in a map. When a duplicate appears, jump `left` directly past its previous occurrence.

For example, with `s = "abba"`, the last-seen index of `'b'` may be before the current window's `left` boundary when `'b'` appears again. Use `left = max(left, char_map[current_char] + 1)` so that `left` never moves backward.

```python
def lengthOfLongestSubstring_map(s: str) -> int:
    char_map = {}  # Maps each character to its last seen index
    left = 0
    max_length = 0

    for right in range(len(s)):
        current_char = s[right]

        # If the character was seen inside the active window, jump past it
        if current_char in char_map:
            left = max(left, char_map[current_char] + 1)

        char_map[current_char] = right
        max_length = max(max_length, right - left + 1)

    return max_length
```

| Strategy | Time complexity | Extra space complexity | Status |
|:---|:---|:---|:---|
| Brute force (all substrings) | $O(N^2)$ to $O(N^3)$ | Up to $O(N)$ | Too slow |
| HashSet sliding window | $O(N)$ | $O(\min(N, M))$ | Linear; each pointer advances at most $N$ times |
| **HashMap last-seen index jump** | **$O(N)$** | **$O(\min(N, M))$** | **Linear; jumps `left` directly past duplicates** |