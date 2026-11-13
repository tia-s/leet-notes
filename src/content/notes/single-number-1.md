---
title: "Why Does XOR Cancel Out Pairs?"
summary: "XOR combines values so that pairs disappear and an unmatched value remains."
category: "algorithm"
tags: ["Bit Manipulation"]
date: "2026-10-12T12:00:00Z"
featured: false
---

## When pairs cancel out

In *Single Number*, one value appears once and every other value appears twice. XOR has a useful property here: `x ^ x` equals `0`, so each pair cancels out and the unpaired value remains.

The problem asks for linear time and constant extra space.

### Examples
* **Example 1:**
  * **Input:** `nums = [2,2,1]`
  * **Output:** `1`
* **Example 2:**
  * **Input:** `nums = [4,1,2,1,2]`
  * **Output:** `4`
* **Example 3:**
  * **Input:** `nums = [1]`
  * **Output:** `1`

### Constraints
* `1 <= nums.length <= 3 * 10^4`
* `-3 * 10^4 <= nums[i] <= 3 * 10^4`
* Each element in the array appears twice except for one element which appears only once.

---

Counting each value by comparing it with every other value takes $O(N^2)$ time. It uses only a fixed amount of extra space, but scanning the whole array for every element repeats a lot of work.


### Counting every occurrence

```lua
Function SingleNumber(nums):
    For each num in nums:
        count = 0
        For each check_num in nums:
            If num == check_num:
                count = count + 1
        
        If count == 1:
            Return num
```

```python
def singleNumber(nums: list[int]) -> int:
    for num in nums:
        # .count() iterates through the list, making this O(n^2)
        if nums.count(num) == 1:
            return num
```

This keeps extra space constant, but it does not meet the time requirement. Sorting brings equal values next to each other, making it possible to find the unpaired value in one pass.

### Sorting and checking adjacent values

After sorting, a single pass can check adjacent pairs. The pass is $O(N)$, but sorting takes $O(N \log N)$, so the overall method is not linear.

```lua
Function SingleNumber(nums):
    Sort nums in ascending order
    
    // Step by 2 since duplicates will be adjacent
    For i from 0 to length(nums) - 2 step 2:
        If nums[i] != nums[i+1]:
            Return nums[i]
            
    // If the single number is at the very end
    Return nums[length(nums) - 1]
```

```python
def singleNumber(nums: list[int]) -> int:
    nums.sort()  # O(n log n) overhead
    
    # Check pairs
    for i in range(0, len(nums) - 1, 2):
        if nums[i] != nums[i + 1]:
            return nums[i]
            
    # The single element must be the last one
    return nums[-1]
```

### Tracking counts in a hash map

```lua
Function SingleNumber(nums):
    Initialize an empty hash map 'counts'
    
    For each num in nums:
        If num exists in counts:
            counts[num] = counts[num] + 1
        Else:
            counts[num] = 1
            
    For each (key, value) in counts:
        If value == 1:
            Return key
```

```python
def singleNumber(nums: list[int]) -> int:
    counts = {}
    
    # Tally occurrences
    for num in nums:
        counts[num] = counts.get(num, 0) + 1
        
    # Find the one with a single occurrence
    for num, count in counts.items():
        if count == 1:
            return num
```

The hash map reduces the time to $O(N)$, but its storage grows with the number of distinct values, so it uses $O(N)$ extra space.

To stay within constant space, the running state needs a fixed size. One possible approach is to represent each number by its sign and decimal digits, then toggle a flag for each digit position as values appear.

### Toggling decimal digits

Under the stated value limits, each number has at most five decimal digits. Toggling its sign and each digit at its place value takes at most five steps per number, for $O(N)$ time. The set of possible place-and-digit pairs is fixed, so the storage remains $O(1)$ as the array grows.

For `[53, -24, 53]`, the first value, `53`, turns on the tens and ones flags for `5` and `3`:

- **Sign toggle:** +
- **Tens position flags:** 0 1 2 3 4 *5* 6 7 8 9
- **Ones position flags:** 0 1 2 *3* 4 5 6 7 8 9

For `-24`, toggle the sign and the digits in the tens and ones positions:

- **Sign toggle:** *-*
- **Tens position flags:** 0 1 *2* 3 4 *5* 6 7 8 9
- **Ones position flags:** 0 1 2 *3* *4* 5 6 7 8 9

When `53` appears again, its digit flags turn off. Its positive sign leaves the sign flag unchanged:

- **Sign toggle:** *-*
- **Tens position flags:** 0 1 *2* 3 4 5 6 7 8 9
- **Ones position flags:** 0 1 2 3 *4* 5 6 7 8 9

The remaining flags represent the negative sign, 2 tens, and 4 ones: `-24`.

This method cancels duplicate numbers without storing each number. It works under the stated range of values, but the decimal bookkeeping is more involved than a bitwise operation.

```lua
Function SingleNumber(nums):
    Initialize empty dictionary 'toggles' to track (place_value, digit)
    Initialize 'sign_toggle' = 0
    
    For each num in nums:
        If num < 0:
            sign_toggle = sign_toggle XOR 1
            num = absolute(num)
            
        place = 1
        While num > 0:
            digit = num % 10
            key = (place, digit)
            
            // Toggle the state (True if seen once, False/Removed if seen twice)
            If key exists in toggles:
                Remove key from toggles
            Else:
                toggles[key] = True
                
            num = num / 10 (integer division)
            place = place * 10
            
    // Reconstruct the final number
    result = 0
    For each (place, digit) in toggles:
        result = result + (digit * place)
        
    Return -result if sign_toggle == 1 else result
```

```python
def singleNumber(nums: list[int]) -> int:
    # Tracks active place-value digits: {(place_value, digit): True}
    toggles = {}
    sign_toggle = 0

    for num in nums:
        if num < 0:
            sign_toggle ^= 1
            num = -num

        place = 1
        temp = num
        while temp > 0:
            digit = temp % 10
            key = (place, digit)

            if key in toggles:
                del toggles[key]
            else:
                toggles[key] = True

            temp //= 10
            place *= 10

    # Reconstruct the single number from remaining active digits
    result = 0
    for (place, digit), _ in toggles.items():
        result += digit * place

    return -result if sign_toggle else result
```

The same cancellation idea is simpler in binary. XOR toggles each bit, so a number combined with itself cancels out.

### Applying the same idea with XOR

XOR has two useful properties: `x ^ x` is `0`, and `x ^ 0` is `x`. Combining every value into one running result cancels each pair and leaves the unpaired value.

For example:
* Start at `000` 
* Sees `5` $\rightarrow$ now it's `101` 
* Sees `6` $\rightarrow$ now it's `110 ^ 101` = `011` 
* Sees `6` again $\rightarrow$ now it's `110 ^ 011` = `101`

The result is `5`; the two occurrences of `6` cancel each other.

XOR applies this cancellation to every bit. Each duplicated value restores the running result to what it was before that pair was added, leaving the value that has no pair.

This works whenever exactly one value appears an odd number of times and all others appear an even number of times. The stated problem is a special case: one value appears once, and every other value appears twice.

```lua
Function SingleNumber(nums):
    Initialize result = 0
    
    For each num in nums:
        result = result XOR num
        
    Return result
```

```python
def singleNumber(nums: list[int]) -> int:
    result = 0
    for num in nums:
        result ^= num
    return result
```

There is another linear-time method: double the sum of the distinct values, then subtract the sum of the whole array. It uses a set, so its extra space grows with the input.

### Using the sum of distinct values

$$2 \times (\text{sum of the distinct numbers}) - (\text{sum of everything})$$

For `[4, 1, 2, 1, 2]`, the distinct values are `[4, 1, 2]`:

$2 \times (4 + 1 + 2) = 14$

The sum of the original array is $4 + 1 + 2 + 1 + 2 = 10$.
$14 - 10 = 4$.

Building the set and calculating the sums take $O(N)$ time overall. The set requires $O(N)$ extra space.

This method does not meet the constant-space requirement.

```lua
Function SingleNumber(nums):
    Get unique numbers from nums (using a Set)
    sum_unique = sum(unique numbers)
    sum_all = sum(nums)
    
    Return (2 * sum_unique) - sum_all
```

```python
def singleNumber(nums: list[int]) -> int:
    return 2 * sum(set(nums)) - sum(nums)
```

XOR meets both the linear-time and constant-space requirements. Its result depends on the frequency pattern: it isolates one value only when that value appears an odd number of times and all other values appear an even number of times.

| Approach | Time complexity | Extra space |
|:---|:---|:---|
| Count each value by scanning | $O(N^2)$ | $O(1)$ |
| Sort and check adjacent pairs | $O(N \log N)$ | $O(1)$ |
| Count values in a hash map | $O(N)$ | $O(N)$ |
| Toggle decimal place values | $O(N)$ | $O(1)$ |
| **XOR** | **$O(N)$** | **$O(1)$** |
| Sum distinct values | $O(N)$ | $O(N)$ |