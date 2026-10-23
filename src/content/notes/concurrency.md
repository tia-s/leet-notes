---
title: "Producer-Consumer Problem"
summary: "Build a bounded queue with backpressure."
category: "low-level-systems"
tags: [Concurrency, Producer-Consumer, Bounded Queue, Backpressure, Condition Variables, Synchronization, Graceful Shutdown]
date: "2026-10-16T11:24:23Z"
featured: true
---

## Problem Statement

Create a bounded queue with a maximum capacity of three items. A producer thread must attempt to push ten tasks rapidly, which should force it to pause when the queue is full. After all tasks are processed, the producer must signal the consumer to shut down safely.

## Synchronization Mechanics

At the systems level, a bounded queue with a maximum capacity of three is really a fixed-sized array in RAM that is configured as a circular buffer. When the queue is full, the write pointer (tail) will be at index 2 while the read pointer (head) will be at index 0, ready to wrap around to the beginning of the memory block rather than shifting data.

Multiple threads in the same program running simultaneously on different CPU cores share the same virtual memory space. If one thread reads a memory address (consumer thread) while another is writing to it (producer thread), this can result in corrupted data or a race condition. Hardware-level atomic instructions, such as compare-and-swap, are used to build mutexes that protect shared state so that only one thread can access the queue at a time. 

A bounded queue introduces another problem: backpressure. When the queue is full, the producer should not continuously check the lock in a spin lock (continuously looping to check the state of the mutex), as this is inefficient and wastes CPU cycles. Instead, it should yield execution to the OS scheduler which should freeze the producer thread until space is available. This requires OS-level signaling mechanisms to freeze the producer thread through condition variables.

Safe termination also requires a deterministic way to tell a waiting consumer that no more tasks are incoming. This allows it to exit gracefully instead of blocking forever. 

High-level languages provide thread-safe queue data structures that handle locking, sleeping, and waking transparently. However, implementing these mechanisms directly in systems languages exposes how concurrency relies on CPU atomic instructions and kernel-level context switching. 

Best practices dictate holding a lock for as little time as possible. Therefore, a consumer should only pull one item from the queue per lock cycle. In order for this to work, each item in the queue must represent a meaningful, self-contained unit of work. 

If the data chunks are too small, threads will complete their work instantly and there will be high lock contention as they try to reacquire the lock. Conversely, if the data chunks are too large, one thread monopolizes the workload while the others sit idle, defeating the purpose of concurrency. Determining the right size for a task is known as tuning the system's work granularity ("The Goldilocks Problem").


## C Implementation: Manual Concurrency

In C, we interface directly with POSIX threads (`pthreads`). There are no built-in thread-safe queue data structures, so we build the queue manually using an array, a `pthread_mutex_t` to prevent data races, and two `pthread_cond_t` condition variables for backpressure and waking.

### Key Considerations

#### Premature Wakeups

A thread waiting on a condition variable can wake even when the condition it was waiting for has not been met. This can happen when there's a microsecond gap between when the kernel signals a sleeping thread and when that thread actually aquires the mutex. During that gap, an active thread on another CPU core can acquire the lock, alter the shared memory, then release the lock, leaving the signaled thread with a condition that is no longer valid. 

The kernel may also independently wake a sleeping thread to process low-level system signals or hardware interrupts. When control returns from the kernel to user space, the thread wakes up regardless of whether the application's condition variable was signaled.

Due to these spurious wakeups, a simple `if` statement to check queue capacity before sleeping would fail. Instead, we need to wrap `pthread_cond_wait` in a `while` loop that re-evaluates the condition after each wakeup.

#### Manual Lock Orchestration

`pthread_cond_wait` atomically releases the mutex while putting the thread to sleep, then reacquires it once the thread is signaled. The mutex must be explicitly locked _before_ calling `pthread_cond_wait` so that it can safely evaluate the condition in RAM. Once the thread finishes reading the data, it must unlock the mutex to free it for other threads waiting in the OS mutex queue. Mishandling this sequence will permanently freeze the system in a deadlock.

#### Poison Pill Shutdown

C has no built-in concept of a closed queue. Since the kernel has no awareness of the application logic, this state must be explicitly signaled through a sentinel value ("poison pill"). One way to do this is to insert the "poison pill", such as `-1`, into the queue so the consumer knows to exit its loop.

```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <unistd.h>

#define CAPACITY 3
#define TASKS 10
#define POISON_PILL -1

typedef struct {
    int buffer[CAPACITY];
    int count;
    int head;
    int tail;
    pthread_mutex_t lock;
    pthread_cond_t not_full;
    pthread_cond_t not_empty;
} BoundedQueue;

BoundedQueue queue = { .count = 0, .head = 0, .tail = 0 };

void* producer(void* arg) {
    for (int i = 1; i <= TASKS; i++) {
        pthread_mutex_lock(&queue.lock); 
        
        // Spurious wakeup protection: MUST be a while loop
        while (queue.count == CAPACITY) {
            printf("[Producer] Queue full, backing off...\n");
            pthread_cond_wait(&queue.not_full, &queue.lock);
        }
        
        // From this point on, we know the queue is NOT full
        queue.buffer[queue.tail] = i;
        queue.tail = (queue.tail + 1) % CAPACITY;
        queue.count++;
        printf("[Producer] Pushed task %d\n", i);
        
        pthread_cond_signal(&queue.not_empty); // Signal consumer
        pthread_mutex_unlock(&queue.lock); // Manually release lock
    }
    
    // Send shutdown signal (poison pill) once tasks are complete 
    pthread_mutex_lock(&queue.lock);
    while (queue.count == CAPACITY) {
        pthread_cond_wait(&queue.not_full, &queue.lock);
    }
    queue.buffer[queue.tail] = POISON_PILL;
    queue.tail = (queue.tail + 1) % CAPACITY;
    queue.count++;
    pthread_cond_signal(&queue.not_empty);
    pthread_mutex_unlock(&queue.lock);
    
    return NULL;
}

void* consumer(void* arg) {
    while (1) {
        pthread_mutex_lock(&queue.lock);
        
        while (queue.count == 0) {
            pthread_cond_wait(&queue.not_empty, &queue.lock);
        }
        
        // From this point on, we know the queue is NOT empty
        int task = queue.buffer[queue.head];
        queue.head = (queue.head + 1) % CAPACITY;
        queue.count--;
        
        pthread_cond_signal(&queue.not_full); // Signal producer
        pthread_mutex_unlock(&queue.lock); 
        
        // Lock released before checking for poison pill so work can continue
        if (task == POISON_PILL) {
            printf("[Consumer] Shutdown signal received. Exiting.\n");
            break;
        }
        printf("[Consumer] Processed task %d\n", task);
        usleep(100000); // Simulate work to trigger backpressure
    }
    return NULL;
}

int main() {
    pthread_mutex_init(&queue.lock, NULL);
    pthread_cond_init(&queue.not_full, NULL);
    pthread_cond_init(&queue.not_empty, NULL);

    pthread_t prod, cons;
    pthread_create(&prod, NULL, producer, NULL);
    pthread_create(&cons, NULL, consumer, NULL);

    pthread_join(prod, NULL);
    pthread_join(cons, NULL);

    return 0;
}
```

## Go Implementation: Runtime-Scheduled Concurrency

Go was built from the ground up for concurrency. Instead of working directly with OS threads, Go uses goroutines, which are lightweight user-space threads multiplexed onto a smaller pool of OS threads. Channels are the primary mechanism for sharing data between goroutines.

### Key Considerations

#### Native Backpressure

In Go, we can create a buffered channel with `make(chan int, 3)`. If a goroutine sends to a full channel, the Go runtime parks it and schedules another goroutine. The runtime automatically handles waiting and synchronization, so, unlike with C, we do not need explicit condition-variable loops. However, the underlying architecture is identical to the C implementation. A buffered channel is essentially a circular buffer protected by an internal mutex which the Go runtime automatically acquires and either safely transfers the data or parks the goroutine on a waitlist until a condition is met.

#### Closing a Channel

The `close()` function signals that no more values will be sent, replacing the need for a manual "poison pill". It tells the runtime that the data stream has permanently ended, allowing a consumer's `for ... range` loop to exit cleanly once the buffer is fully drained. The producer still maintains sole ownership of closing the channel as the Go runtime will crash if a thread attempts to send data into a closed channel or attempts to close an already-closed channel. The closure must be a one-way signal from the sender indicating its workload is complete.

#### Goroutine Leaks

If the channel is never closed, the consumer goroutine can block forever while waiting for more data. The Go garbage collector cannot reclaim a goroutine that is still blocked.

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

const Capacity = 3
const Tasks = 10

func main() {
	queue := make(chan int, Capacity)
	var wg sync.WaitGroup

	wg.Add(1) // Add consumer as background worker
	go func() {
		defer wg.Done() // Run right before function exits -> subtracts 1 from wg
		// Iterates until the queue channel is closed AND empty
		for task := range queue {
			fmt.Printf("[Consumer] Processed task %d\n", task)
			time.Sleep(100 * time.Millisecond) // Simulate work to trigger backpressure
		}
		fmt.Println("[Consumer] Shutdown signal received. Exiting.")
	}()

	for i := 1; i <= Tasks; i++ {
		fmt.Printf("[Producer] Pushing task %d...\n", i)
		queue <- i // Automatically blocks (backpressure) if channel is full
	}

	close(queue) // Signal consumer to exit

	// Wait for wait group to be 0 before exiting program
	wg.Wait()
}
```

## Rust Implementation: Ownership-Enforced Concurrency

Rust uses OS threads like in C, providing maximum performance without the runtime overhead of Go's background scheduler. To prevent the manual deadlocks and race conditions of C, Rust relies on its compile-time Ownership model. The compiler physically restricts memory access at build time, ensuring safety with zero runtime cost. 

For this bounded queue, we use Rust's standard library `mpsc::sync_channel` which handles the underlying mutex and condition variables under the hood.

### Key Considerations

#### Move Semantics

Rust requires ownership of the channel's receiver to move into the consumer thread. After it has been moved, the main thread cannot also read from the receiver; the compiler rejects that attempt.

#### Implicit Shutdown with `Drop`

There is no `close()` function. Rust uses RAII (Resource Acquisition Is Initialization): when the producer's `tx` (transmitter) goes out of scope, it is dropped. Once all transmitters are dropped, the channel lets the consumer's iterator finish.

#### Handling Send Errors

The `.send()` method returns a `Result`. If the consumer has stopped, sending returns an error instead of silently discarding the failure. The caller must handle that result, for example with `.unwrap()` when failure is unexpected.

```rust
use std::sync::mpsc::sync_channel;
use std::thread;
use std::time::Duration;

const CAPACITY: usize = 3;
const TASKS: usize = 10;

fn main() {
    // tx = transmitter (producer)
    // rx = receiver (consumer)
    let (tx, rx) = sync_channel(CAPACITY);

    // move will modify the anonymous function (closure) so referenced variables outside the closure will be moved from the main function
    let consumer = thread::spawn(move || {
        // The iterator naturally ends when the transmitter is dropped
        for task in rx {
            println!("[Consumer] Processed task {}", task);
            thread::sleep(Duration::from_millis(100)); // Simulate work to trigger backpressure
        }
        println!("[Consumer] Shutdown signal received. Exiting.");
    });

    let producer = thread::spawn(move || {
        for i in 1..=TASKS {
            println!("[Producer] Pushing task {}...", i);
            tx.send(i).unwrap(); 
        }
        // `tx` goes out of scope here and is implicitly dropped, closing the channel.
    });

    producer.join().unwrap();
    consumer.join().unwrap();
}
```