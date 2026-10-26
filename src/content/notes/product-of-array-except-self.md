---
title: "Product of Array Except Self"
summary: "Given an integer array, return an array where each element is the product of all input elements except the one at the same index."
category: "algorithm"
tags: ["Dynamic Programming", "Prefix-Suffix"]
date: "2026-10-26T12:00:00Z"
featured: false
---

## LeetCode 238: Product of Array Except Self

Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.

### Example
* **Input:** `nums = [1, 2, 3, 4]`
* **Output:** `[24, 12, 8, 6]`

### Constraints
* The solution must run in $O(N)$ time.
* Division cannot be used.
* The solution should use $O(1)$ extra space. The output array does not count toward extra space.

---

When I think about solving this manually, I visualize covering the number at index `i` with my finger and multiplying all the remaining visible numbers together:

$$\text{Array: } [1, \ 2, \ \overset{\text{finger}}{\boxed{3}}, \ 4] \implies 1 \times 2 \times 4 = 8$$

Covering index `i` splits the remaining elements into everything to its left and everything to its right. Therefore:

$$\text{Product Except } i = (\text{Product of all elements to the left}) \times (\text{Product of all elements to the right})$$

### Potential Solution 1: Total product with division - $O(n)$ time; $O(1)$ space

An obvious solution was to find the product of the entire array, then divide by each element.

1. Loop through `nums` to compute the total product ($1 \times 2 \times 3 \times 4 = 24$).
2. Loop through it again and compute `24 / nums[i]` for each index.

```python
def productExceptSelf_division(nums: list[int]) -> list[int]:
    total_product = 1
    for num in nums:
        total_product *= num

    answer = []
    for num in nums:
        # Fails the constraint (division forbidden) and crashes if num == 0
        answer.append(total_product // num)

    return answer
```

However, this approach violates the no-division constraint. It also fails when an element is zero since the total product becomes zero, and dividing by that element raises `ZeroDivisionError`.

### Potential Solution 2: Two pointers / nested loops - $O(n^2)$ time; $O(1)$ space

Without division, I can simulate the “finger” model directly. Place an outer pointer `i` on the element being skipped, then use an inner pointer `j` to multiply every other element.

```python
def productExceptSelf_brute_force(nums: list[int]) -> list[int]:
    n = len(nums)
    answer = [1] * n

    # Outer pointer 'i': the index currently covered
    for i in range(n):
        running_product = 1

        # Inner pointer 'j': multiply all non-covered elements
        for j in range(n):
            if i == j:
                continue
            running_product *= nums[j]

        answer[i] = running_product

    return answer
```

For each of the $N$ elements, the inner loop makes $N - 1$ passes, so this takes $O(N^2)$ time. On an array of size $10^5$, that is roughly $10^{10}$ operations and would cause a Time Limit Exceeded (TLE) error. The repeated work comes from recomputing overlapping products for every index instead of reusing previous calculations.

### Potential Solution 3: Prefix and suffix arrays - $O(n)$ time; $O(n)$ space

To avoid redundant multiplications, compute prefix products (everything to the left) and suffix products (everything to the right) independently.

In a forward pass, each prefix product is the previous prefix product multiplied by the preceding number:

$$\text{left\_products}[i] = \text{left\_products}[i - 1] \times \text{nums}[i - 1]$$

In a backward pass, each suffix product is the next suffix product multiplied by the following number:

$$\text{right\_products}[i] = \text{right\_products}[i + 1] \times \text{nums}[i + 1]$$

Multiplying `left_products[i]` by `right_products[i]` gives the answer for index `i`.

```python
def productExceptSelf_two_arrays(nums: list[int]) -> list[int]:
    n = len(nums)
    left_products = [1] * n
    right_products = [1] * n
    answer = [1] * n

    # Build prefix products (left to right)
    for i in range(1, n):
        left_products[i] = left_products[i - 1] * nums[i - 1]

    # Build suffix products (right to left)
    for i in range(n - 2, -1, -1):
        right_products[i] = right_products[i + 1] * nums[i + 1]

    # Combine prefix and suffix products
    for i in range(n):
        answer[i] = left_products[i] * right_products[i]

    return answer
```

This meets the linear time requirement, but the two additional arrays make its extra space complexity $O(N)$.

### Best Solution: Prefix and suffix products in one output array - $O(n)$ time; $O(1)$ extra space

The prefix products can instead be stored directly in the `answer` array during the forward pass. Then, during the backward pass, a single integer (`running_right_product`) tracks the suffix product and is multiplied into each answer. No additional arrays are needed.

```python
def productExceptSelf(nums: list[int]) -> list[int]:
    n = len(nums)
    answer = [1] * n

    # Accumulate prefix products (left to right)
    running_left_product = 1
    for i in range(n):
        answer[i] = running_left_product
        running_left_product *= nums[i]

    # Accumulate suffix products on the fly (right to left)
    running_right_product = 1
    for i in range(n - 1, -1, -1):
        answer[i] *= running_right_product
        running_right_product *= nums[i]

    return answer
```

For `nums = [1, 2, 3, 4]`, the first pass stores the prefix products:

* `answer = [1, 1, 2, 6]`

The second pass multiplies each prefix product by the product of the numbers to its right:

```text
Index  nums[i]  Prefix  Right before  Result  Right after
-----  -------  ------  ------------  ------  -----------
  3       4        6          1           6       1 × 4 = 4
  2       3        2          4           8       4 × 3 = 12
  1       2        1         12          12      12 × 2 = 24
  0       1        1         24          24      24 × 1 = 24
```

The result is `[24, 12, 8, 6]`.

| Strategy | Time complexity | Extra space complexity | Status |
|:---|:---|:---|:---|
| Total product with division | $O(N)$ | $O(1)$ | Invalid (uses division and fails on zero) |
| Two pointers / nested loops | $O(N^2)$ | $O(1)$ | Too slow (Time Limit Exceeded) |
| Explicit prefix/suffix arrays | $O(N)$ | $O(N)$ | Suboptimal space |
| **Single output array + scalar (best)** | **$O(N)$** | **$O(1)$** | **Meets both constraints** |
