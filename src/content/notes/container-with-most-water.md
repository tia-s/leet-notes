---
title: "When Can Two Pointers Move Inward Safely?"
summary: "The shorter boundary can tell us which pointer to move when the endpoints determine the result."
category: "algorithm"
tags: ["Two-Pointer"]
date: "2026-10-26T12:00:00Z"
featured: false
---

## Choosing which pointer to move

The challenge with converging pointers is deciding which end to move. In *Container With Most Water*, the shorter line limits the height. Moving the taller line inward makes the container narrower without raising that height limit, so move the shorter line instead.

The values between the two lines do not affect the area. That is different from a sliding window, where the values inside the range determine whether it is valid. The tallest lines do not always make the largest container, either.

## What determines the area?

Each array value represents a vertical line rising from the x-axis. Two lines at indices $i$ and $j$ form a container. Its width is $j - i$, and its height is limited by the shorter line:

$$\text{Area}(i, j) = (j - i) \times \min(\text{height}[i], \text{height}[j])$$

For `height = [1, 8, 6, 2, 5, 4, 8, 3, 7]`, the lines at indices 1 and 8 produce width 7 and height 7, for an area of 49.

Each array value is one of the container's vertical sides, and the x-axis is its floor:

```
Index:    0    1    2    3    4    5    6    7    8
Height:  [1,   8,   6,   2,   5,   4,   8,   3,   7]
          |    |    |    |    |    |    |    |    |
```

### How this differs from a sliding window

A sliding window maintains a property of the contiguous elements inside its bounds, such as a sum or a character frequency. For nonnegative values, a sum-constrained window can be written as:

```python
def sliding_window_template(arr, k):
    left = 0
    current_sum = 0
    max_sum = 0

    for right in range(len(arr)):
        current_sum += arr[right]

        while current_sum > k:
            current_sum -= arr[left]
            left += 1

        max_sum = max(max_sum, current_sum)
    return max_sum
```

Converging pointers instead track the two boundaries. They start at opposite ends and move inward according to the boundary heights:

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

### Checking every pair

One way to find the largest area is to evaluate every pair of lines:

```python
def maxArea_brute_force(height: list[int]) -> int:
    max_water = 0
    n = len(height)

    for i in range(n):
        for j in range(i + 1, n):
            width = j - i
            container_h = min(height[i], height[j])
            current_area = width * container_h

            max_water = max(max_water, current_area)

    return max_water
```

The nested loops make $\frac{N(N-1)}{2}$ comparisons, for $O(N^2)$ time and $O(1)$ extra space. At $N = 10^5$, that is roughly $5 \times 10^9$ pairs. The pointer approach avoids many of those checks by ruling out candidates as it moves.

## Why the tallest lines are not always best

Area is the product of two competing quantities:

$$\text{Area} = \text{Width} \times \text{Height}$$

Choosing the tallest lines alone can produce a small area when they are close together. For example:

$$\text{height} = [\mathbf{50}, \ 1, \ 1, \ 1, \ 1, \ 1, \ 1, \ 1, \ \mathbf{50}, \ \mathbf{100}, \ \mathbf{100}]$$

1. **Tallest lines:** Indices 9 and 10 have height 100, width $10 - 9 = 1$, and area $1 \times 100 = \mathbf{100}$.
2. **Shorter lines farther apart:** Indices 0 and 8 have height 50, width $8 - 0 = 8$, and area $8 \times 50 = \mathbf{400}$.

Width can compensate for a lower height, so neither dimension can be optimized in isolation.

## Why move the shorter line?

Start with `left = 0` and `right = N - 1`, the pair with the greatest possible width. The shorter boundary limits the height:

$$\text{Height Limit} = \min(\text{height}[\text{left}], \text{height}[\text{right}])$$

Suppose `height[left] = 1` and `height[right] = 7` at width 8. The current area is $8 \times 1 = 8$, with the left line as the limiting boundary.

Keeping the shorter line while moving the taller boundary inward reduces the width, while the height remains at most 1. Every such container has area strictly less than the current area:

$$\text{Area}_{\text{new}} \le (\text{smaller width}) \times 1 < 8$$

The shorter line cannot form a better container with any line inside the current pair. Its pointer can therefore move inward, eliminating all of those candidates at once. When the boundary heights are equal, either pointer can move: the width decreases, and the limiting height cannot exceed its current value.

## Putting the idea into code

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

For the example array `[1, 8, 6, 2, 5, 4, 8, 3, 7]`, the scan proceeds as follows:

1. **Pointers `(0, 8)`**, heights `(1, 7)`: width `8`, area `8 × 1 = 8`. Move `left`, the limiting boundary.
2. **Pointers `(1, 8)`**, heights `(8, 7)`: width `7`, area `7 × 7 = 49`. Move `right`, the limiting boundary.
3. **Pointers `(1, 7)`**, heights `(8, 3)`: width `6`, area `6 × 3 = 18`. Move `right`.
4. **Pointers `(1, 6)`**, heights `(8, 8)`: width `5`, area `5 × 8 = 40`. Either pointer can move; this trace moves `right`.
5. **Pointers `(1, 5)`**, heights `(8, 4)`: width `4`, area `4 × 4 = 16`. Move `right`.
6. **Pointers `(1, 4)`**, heights `(8, 5)`: width `3`, area `3 × 5 = 15`. Move `right`.
7. **Pointers `(1, 3)`**, heights `(8, 2)`: width `2`, area `2 × 2 = 4`. Move `right`.
8. **Pointers `(1, 2)`**, heights `(8, 6)`: width `1`, area `1 × 6 = 6`. Move `right`; the pointers meet and the scan ends.

Each step moves one pointer inward, so there are at most $N - 1$ steps. The scan runs in $O(N)$ time and uses $O(1)$ extra space.

| Approach | Time complexity | Extra space |
|:---|:---|:---|
| Evaluate every pair | $O(N^2)$ | $O(1)$ |
| **Converging pointers** | **$O(N)$** | **$O(1)$** |
