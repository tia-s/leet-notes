---
title: "How Can a Sliding Window Handle Repeated Characters?"
summary: "A sliding window can keep a substring free of repeats as it moves through a string."
category: "algorithm"
tags: ["Sliding Window"]
date: "2026-10-25T12:00:00Z"
featured: true
---

## Keeping a window free of repeats

*Longest Substring Without Repeating Characters* asks for the longest contiguous range of characters with no repeats. A sliding window fits naturally: extend the right edge while the range stays valid, then move the left edge when a repeated character appears.

### Example strings
* **Example 1:** `s = "abcabcbb"` → output: `3` (`"abc"`)
* **Example 2:** `s = "bbbbb"` → output: `1` (`"b"`)
* **Example 3:** `s = "pwwkew"` → output: `3` (`"wke"`)

The problem allows an empty string and calls for $O(N)$ time with $O(\min(N, M))$ extra space, where $M$ is the size of the character set.

A **substring** is contiguous, so `"wke"` is a substring of `"pwwkew"`. A **subsequence** can skip characters while keeping their order; `"pwke"` is a subsequence, but not a substring.

### Checking every possible range

Start at each index and extend the range until a character repeats:

```
Start at index 0 ('a'): "abc" -> duplicate 'a' hit
Start at index 1 ('b'): "bca" -> duplicate 'b' hit
Start at index 2 ('c'): "cab" -> duplicate 'c' hit
...
```

Checking every possible start and end position requires $O(N^2)$ pairs. Scanning each candidate range for duplicates can raise the total work to $O(N^3)$. Either way, overlapping ranges are checked repeatedly.

There is no need to create or store each substring. The current length is `right - left + 1`, and a set or map can track which characters are in the window.

### Expanding and shrinking the window

The window represents a contiguous range whose characters are all unique:

1. Start `left` and `right` at index 0.
2. Move `right` forward one character at a time, adding each character to a lookup collection for the current window.
3. When a duplicate appears, shrink the window from the left until that duplicate is removed.
4. After each valid window, update `max_length`.

### Moving the left edge one step at a time

The set-based version advances `left` until the repeated character has left the window. Each character enters and leaves the set at most once.

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

### Following the window through `"pwwkew"`

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

### Jumping past the previous occurrence

The map-based version stores each character's most recent index. When a repeat appears, `left` can jump directly past the previous occurrence instead of moving one position at a time.

For `"abba"`, the second `'a'` refers to an occurrence before the current window. Using `left = max(left, char_map[current_char] + 1)` keeps `left` from moving backward.

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

| Approach | Time complexity | Extra space |
|:---|:---|:---|
| Check every range | $O(N^2)$ to $O(N^3)$ | Up to $O(N)$ |
| Set-based sliding window | $O(N)$ | $O(\min(N, M))$ |
| **Map with last-seen indices** | **$O(N)$** | **$O(\min(N, M))$** |