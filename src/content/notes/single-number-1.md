---
title: "Single Number"
summary: "Finding the single unique element in an array where every other element appears twice."
category: "algorithm"
tags: ["Bit Manipulation"]
date: "2026-10-12T12:00:00Z"
featured: false
---

## LeetCode 136: Single Number

Given a non-empty array of integers `nums`, every element appears twice except for one. Find that single one.

You must implement a solution with a linear runtime complexity and use only constant extra space.

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

We could compare every number with every other number to count occurrences. The space complexity remains $O(1)$ because we only allocate a single variable to store the count during our checks, which requires the same amount of memory regardless of how large the input array gets. However, comparing every number would lead to an $O(n^2)$ time complexity. Because we iterate through all $n$ elements and scan the entire array of $n$ elements for each one, it results in $n \times n$ operations, breaking the linear constraint.


### Potential Solution 1: Brute Force - $O(n^2)$ time; $O(1)$ space

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

Using only constant extra space without implies storing a tracking variable and somehow keeping track of the solution, even when the duplicate numbers are scattered.

This makes me think of sorting the array first, then looping through with a pointer to check if the current number is different from the adjacent number.

### Potential Solution 2: Sorting & Pointer Check - $O(n \log n)$ time; $O(1)$ space

While this approach feels linear because we only loop through the array once ($O(n)$), the initial sorting step takes $O(n \log n)$ time. Therefore, the overall time complexity is $O(n \log n)$, which is better than the previous solution but also doesn't meet the linear $O(n)$ constraint.

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

This avoids taking up any extra space, but the sorting adds time complexity overhead.

Thinking of a way to solve this in strict linear time without sorting, we could use a data structure to keep track of the counts (most likely a hash map).

### Potential Solution 3: Tracking counts in a Hash Map - $O(n)$ time; $O(n)$ space

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

This works and hits our $O(n)$ time target, but it breaks the constraint for $O(1)$ space since the hash map scales with the input size.

If we go back to the idea of storing it in a tracking variable, we know we'd need a way to update that singular variable in $O(1)$ time to avoid adding additional time complexity. If we're able to do that, we could loop through, add to the variable, and remove/pop from that variable without extra space. This way, we'd be able to add as we go through the list and remove if we've already added it.

Therefore, another important consideration is that we would also need a way to check if we've already added it to the variable.

### Potential Solution 4: Place-value toggling - $O(n)$ time; $O(1)$ space

If we write this out, one way we can keep track of numbers without storing them directly is to consider their place values. 

We iterate through the $n$ elements, and for each number, we perform a while-loop proportional to its number of digits. Based on the constraints, the maximum value is $3 \times 10^4$ (5 digits). This means we perform at most $5$ operations per number, yielding $5n$ operations, which simplifies to $O(n)$ time. 

For memory, we store active digits in a dictionary. Since numbers are capped at 5 digits, there are at most 5 place-values $\times$ 10 possible digits = 50 maximum keys in the dictionary, plus 1 sign toggle. This dictionary caps at 51 items regardless of how massive $n$ gets, meaning it doesn't scale with the input array, which simplifies to $O(1)$ space.

As a simplified example of how the logic works, say we have a sign toggle and only up to two-digit numbers. We will italicize the flags that are currently toggled "on". 

Let's look at the array `[53, -24, 53]`. First, we loop through and see 53. The sign remains positive, and we toggle the 5 for the tens and 3 for the ones:

- **Sign toggle:** +
- **Tens position flags:** 0 1 2 3 4 *5* 6 7 8 9
- **Ones position flags:** 0 1 2 *3* 4 5 6 7 8 9

Now we reach -24. The negative value means we toggle the sign to negative. We also toggle the 2 for tens and 4 for ones:

- **Sign toggle:** *-*
- **Tens position flags:** 0 1 *2* 3 4 *5* 6 7 8 9
- **Ones position flags:** 0 1 2 *3* *4* 5 6 7 8 9

When we see 53 again, we toggle the 5 and 3 back off. Since it's a positive number, it doesn't flip the sign toggle, leaving it as negative:

- **Sign toggle:** *-*
- **Tens position flags:** 0 1 *2* 3 4 5 6 7 8 9
- **Ones position flags:** 0 1 2 3 *4* 5 6 7 8 9

Now the only flags left "on" are the negative sign, 2 tens, and 4 ones (aka -24).

This works because we treat seeing the number like flipping a switch. This allows us to keep track of what we've already seen without sorting or storing numbers in a dynamically-sized data structure.

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

This conceptual framework reveals a much easier and more efficient approach. Considering we need to track only two states (seen once vs. seen twice), we can apply this place-value toggling idea directly to binary. Computers process data in binary natively, so we can simply use bitwise operations to maintain our running answer efficiently.

### Best Solution: Bit manipulation (XOR) - $O(n)$ time; $O(1)$ space

We could keep a running variable that contains which bits are on or off in each binary place. We use the XOR (^) operator to compare each number with this running variable.

For example: 
* Start at `000` 
* Sees `5` $\rightarrow$ now it's `101` 
* Sees `6` $\rightarrow$ now it's `110 ^ 101` = `011` 
* Sees `6` again $\rightarrow$ now it's `110 ^ 011` = `101`

This tells us only `5` appeared once because `6` cancelled itself out. 

XOR only shows on if the digits differ, so we can apply this to every digit independently (although this is done at the same time in the actual hardware) to flip each bit as needed. Every duplicated number will flip it back to `000` (or however many places) leaving the one non-duplicated one exposed. 

This also makes the constraints within which this solution will actually work very clear. The size of the list will always be odd since only one number isn't duplicated. The lone number must appear an odd number of times, and every other number has to appear an even number of times.

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

There is also a mathematical way to solve this that becomes obvious once we note those constraints. It requires finding the distinct numbers, doubling their sum, and subtracting the sum of the entire list.

### Potential Solution 5: The Math Way - $O(n)$ time; $O(n)$ space

$$2 \times (\text{sum of the distinct numbers}) - (\text{sum of everything})$$

If the array is [4, 1, 2, 1, 2], the unique numbers are [4, 1, 2].

$2 \times (4 + 1 + 2) = 14$

The sum of the original array is $4 + 1 + 2 + 1 + 2 = 10$.
$14 - 10 = 4$.

Creating a `set()` from the array requires iterating through all $n$ elements and allocating new memory to store the unique numbers, taking $O(n)$ time and $O(n)$ space. The `sum()` function also iterates through the elements, taking $O(n)$ time, but it only maintains a running total, using $O(1)$ space. Combined, the operations scale linearly for an overall $O(n)$ time complexity. 

However, the memory allocated for the set violates the constant space constraint, resulting in an overall $O(n)$ space complexity.

$$2 \times (\text{sum of the distinct numbers}) - (\text{sum of everything})$$

If the array is `[4, 1, 2, 1, 2]`, the unique numbers are `[4, 1, 2]`. 
$2 \times (4 + 1 + 2) = 14$
The sum of the original array is $4 + 1 + 2 + 1 + 2 = 10$.
$14 - 10 = 4$.

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

Ultimately, the bit manipulation (XOR) solution is the only one that satisfies both the $O(1)$ space and $O(n)$ time constraints while remaining perfectly robust against edge cases. It is perfectly robust for this specific problem, but its logic strictly depends on the input constraints: XOR cancellation only isolates the target if exactly one element occurs an odd number of times and every other element occurs an even number of times.