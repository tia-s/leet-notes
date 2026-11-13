---
title: "How Can Prefix and Suffix Products Replace Division?"
summary: "Each output can be built from the products on either side of its index."
category: "algorithm"
tags: ["Dynamic Programming", "Prefix-Suffix"]
date: "2026-10-26T12:00:00Z"
featured: false
---

## Splitting each answer into two products

*Product of Array Except Self* asks for an output where each position is the product of every input value except the one at that index. Division is not allowed, and the target is $O(N)$ time with $O(1)$ extra space beyond the output array.

### Example
* **Input:** `nums = [1, 2, 3, 4]`
* **Output:** `[24, 12, 8, 6]`

Set aside the value at index `i`. The remaining values split into the ones on its left and the ones on its right:

`[1, 2, (skip 3), 4]` gives `1 × 2 × 4 = 8`.

So the answer at index `i` is:

$$\text{Product Except } i = (\text{Product of all elements to the left}) \times (\text{Product of all elements to the right})$$

### Why not divide the total product?

One direct approach is to multiply the entire array, then divide by each element.

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

This uses division, which the problem rules out. It also fails when an element is zero: the total product becomes zero, and dividing by that element raises `ZeroDivisionError`.

### Recomputing each product

Without division, a direct approach is to skip each index in turn and multiply all the other values.

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

The inner loop runs $N - 1$ times for each of the $N$ output positions, for $O(N^2)$ time. The same partial products are recomputed for many indices.

### Reusing prefix and suffix products

For each index, calculate the product of the values before it and the product of the values after it. A forward pass builds the left products; a backward pass builds the right products.

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

### Storing prefixes in the output array

The output array can hold the prefix products during the forward pass. In the backward pass, a single integer, `running_right_product`, tracks the suffix product and is multiplied into each answer. This avoids allocating separate prefix and suffix arrays.

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

| Approach | Time complexity | Extra space |
|:---|:---|:---|
| Total product with division | $O(N)$ | $O(1)$ |
| Recompute each product | $O(N^2)$ | $O(1)$ |
| Separate prefix and suffix arrays | $O(N)$ | $O(N)$ |
| **Output array and one running product** | **$O(N)$** | **$O(1)$** |
