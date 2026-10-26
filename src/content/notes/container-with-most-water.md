---
title: "Container With Most Water"
summary: "Choose two vertical lines that form a container holding the greatest possible amount of water."
category: "algorithm"
tags: ["Two-Pointer"]
date: "2026-10-26T12:00:00Z"
featured: false
---

## LeetCode 11: Container With Most Water

Given an integer array `height` of length $N$, each element represents a vertical line drawn at index $i$ from $(i, 0)$ to $(i, \text{height}[i])$. Choose two lines that, together with the x-axis, form a container that holds the most water, and return the maximum area.

The container cannot be slanted. The target complexity is $O(N)$ time and $O(1)$ extra space.

### Example
* **Input:** `height = [1, 8, 6, 2, 5, 4, 8, 3, 7]`
* **Output:** `49` (indices 1 and 8 have heights 8 and 7: width $8 - 1 = 7$, height $\min(8, 7) = 7$, and area $7 \times 7 = 49$.)

---

I visualize each number as a vertical wall rising from a flat floor (the x-axis):

```
Index:    0    1    2    3    4    5    6    7    8
Height:  [1,   8,   6,   2,   5,   4,   8,   3,   7]
          |    |    |    |    |    |    |    |    |
```

The array elements themselves form the left and right boundaries; there are no external walls. Indices are one unit apart, so the width between indices $i$ and $j$ is $j - i$. Water spills over the shorter wall, so the container height is $\min(\text{height}[i], \text{height}[j])$.

$$\text{Area}(i, j) = (j - i) \times \min(\text{height}[i], \text{height}[j])$$

### Potential Solution 1: Brute force - $O(n^2)$ time; $O(1)$ space

To guarantee finding the maximum area, evaluate every pair of walls:

```python
def maxArea_brute_force(height: list[int]) -> int:
    max_water = 0
    n = len(height)

    # Compare every pair (i, j)
    for i in range(n):
        for j in range(i + 1, n):
            width = j - i
            container_h = min(height[i], height[j])
            current_area = width * container_h

            max_water = max(max_water, current_area)

    return max_water
```

The two nested loops make $\frac{N(N-1)}{2}$ comparisons, for $O(N^2)$ time. With $N = 10^5$, that is approximately $5 \times 10^9$ operations and would cause a Time Limit Exceeded (TLE) error. This approach also checks combinations that can be logically eliminated without calculating their areas.

### Choosing the right pattern: Sliding window or converging pointers?

At first, this problem can look like a sliding-window problem because it examines spans across an array. However, a sliding window tracks metrics of the contiguous elements inside the window (such as subarray sums or character frequencies). Here, the elements between indices $i$ and $j$ do not affect the water held; only the two boundary walls matter.

A sliding-window template expands and shrinks a window to maintain a condition on its contents:

```python
def sliding_window_template(arr, k):
    left = 0
    current_sum = 0
    max_sum = 0

    for right in range(len(arr)):
        current_sum += arr[right]  # Expand window right

        while current_sum > k:     # Shrink window left
            current_sum -= arr[left]
            left += 1

        max_sum = max(max_sum, current_sum)
    return max_sum
```

For this problem, converging pointers track the outer boundaries instead. They start at opposite ends and move inward based on the heights of those boundaries:

```python
def converging_pointers_template(height):
    left = 0
    right = len(height) - 1
    max_water = 0

    while left < right:
        width = right - left
        container_h = min(height[left], height[right])
        max_water = max(max_water, width * container_h)

        if height[left] < height[right]:
            left += 1
        else:
            right -= 1

    return max_water
```

### Why not just choose the tallest walls?

Area is the product of two variables that pull in opposite directions:

$$\text{Area} = \text{Width} \times \text{Height}$$

Choosing the tallest walls alone can produce a small area if they are close together. For example:

$$\text{height} = [\mathbf{50}, \ 1, \ 1, \ 1, \ 1, \ 1, \ 1, \ 1, \ \mathbf{50}, \ \mathbf{100}, \ \mathbf{100}]$$

1. **Tallest walls:** Indices 9 and 10 have height 100, width $10 - 9 = 1$, and area $1 \times 100 = \mathbf{100}$.
2. **Medium walls far apart:** Indices 0 and 8 have height 50, width $8 - 0 = 8$, and area $8 \times 50 = \mathbf{400}$.

Since a wider width can outweigh taller walls, I realized we have to evaluate containers systematically rather than jumping straight to the tallest lines.

Starting with `left = 0` and `right = N - 1`, this gives the largest possible width. The shorter of the two walls limits the water height:

$$\text{Height Limit} = \min(\text{height}[\text{left}], \text{height}[\text{right}])$$

Suppose `height[left] = 1` and `height[right] = 7` at width 8. The current area is $8 \times 1 = 8$, and the left wall is the bottleneck.

If we keep that shorter wall and move the taller wall inward, the width decreases while the height remains capped at 1 (or becomes even lower). Any such container has area strictly less than the current area:

$$\text{Area}_{\text{new}} \le (\text{smaller width}) \times 1 < 8$$

Therefore, the shorter wall cannot produce a larger area with any wall inside the current pair. We can safely discard it by moving its pointer inward. When the two walls are equal, moving either pointer inward is safe for the same reason: the width decreases and the height cannot increase beyond the current limit.

### Best Solution: Converging two pointers - $O(n)$ time; $O(1)$ space

```python
def maxArea(height: list[int]) -> int:
    left = 0
    right = len(height) - 1
    max_water = 0

    while left < right:
        width = right - left
        container_h = min(height[left], height[right])
        current_area = width * container_h

        max_water = max(max_water, current_area)

        # Eliminate the shorter boundary wall
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1

    return max_water
```

For `height = [1, 8, 6, 2, 5, 4, 8, 3, 7]`, the pointer trace is:

1. **Pointers `(0, 8)`**, heights `(1, 7)`: width `8`, area `8 × 1 = 8`. Best: **8**. Move `left` (shorter wall).
2. **Pointers `(1, 8)`**, heights `(8, 7)`: width `7`, area `7 × 7 = 49`. Best: **49**. Move `right` (shorter wall).
3. **Pointers `(1, 7)`**, heights `(8, 3)`: width `6`, area `6 × 3 = 18`. Best: **49**. Move `right`.
4. **Pointers `(1, 6)`**, heights `(8, 8)`: width `5`, area `5 × 8 = 40`. Best: **49**. Move either pointer; this trace moves `right`.
5. **Pointers `(1, 5)`**, heights `(8, 4)`: width `4`, area `4 × 4 = 16`. Best: **49**. Move `right`.
6. **Pointers `(1, 4)`**, heights `(8, 5)`: width `3`, area `3 × 5 = 15`. Best: **49**. Move `right`.
7. **Pointers `(1, 3)`**, heights `(8, 2)`: width `2`, area `2 × 2 = 4`. Best: **49**. Move `right`.
8. **Pointers `(1, 2)`**, heights `(8, 6)`: width `1`, area `1 × 6 = 6`. Best: **49**. Move `right`; the pointers meet and the scan ends.

Each step moves one pointer inward, so there are at most $N - 1$ steps. The solution runs in $O(N)$ time and uses only a fixed number of variables, for $O(1)$ extra space.

| Strategy | Time complexity | Extra space complexity | Status |
|:---|:---|:---|:---|
| Brute force (all pairs) | $O(N^2)$ | $O(1)$ | Too slow |
| **Converging two pointers** | **$O(N)$** | **$O(1)$** | **Meets both constraints** |
