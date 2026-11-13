---
title: "Backpressure and Shutdown in Bounded Queues"
summary: "How bounded queues slow producers when full and signal consumers when work is finished."
category: "low-level-systems"
tags: [Concurrency, Producer-Consumer, Bounded Queue, Backpressure, Condition Variables, Synchronization, Graceful Shutdown]
date: "2026-10-16T11:24:23Z"
featured: true
---

## A bounded queue in practice

A bounded queue limits how many tasks can wait between a producer and a consumer. If the producer creates work faster than the consumer can finish it, the queue fills and production has to pause. The Producer-Consumer Problem is about coordinating both sides, including what happens when production ends.

For example, suppose a producer sends ten tasks to a queue with three slots. When all three slots are full, the producer waits until the consumer removes a task. A circular buffer stores the queue in a fixed-size array. `head` points to the next item to read, and `tail` points to the next slot to write. Both indices wrap around at the end of the array, so removing an item does not require shifting the others.

The producer and consumer both access the queue, so a mutex protects the buffer and its indices while either thread reads or updates them. When the queue is full, repeatedly checking for space wastes CPU time. A condition variable lets the producer wait until the consumer removes an item.

When the queue is empty, the consumer waits for another task. The producer also needs to signal when it has finished; otherwise, the consumer can wait forever after processing the last item.

Libraries in higher-level languages provide queues that handle waiting and signaling internally. The C example handles those details directly. In C, the lock is held only while adding or removing a task, and the task is processed after the lock is released. Go and Rust channels handle the waiting internally.

Task size also affects how work is shared. If tasks are too small, workers can spend more time acquiring the lock than doing useful work. If tasks are too large, one worker can stay busy while others sit idle. Choosing a good task size is part of tuning the system.


## C: Using POSIX threads

POSIX threads do not provide a queue, so this example builds one from a fixed array, a `pthread_mutex_t`, and two `pthread_cond_t` condition variables. One condition variable signals that there is space in the queue; the other signals that there is an item to read.

### Waiting on condition variables

A condition-variable wait can return even if the condition is still false. The queue can also change before the waiting thread reacquires the mutex. The thread needs to check the condition again after every wakeup.

Check the condition in a `while` loop around `pthread_cond_wait`. A wakeup may be spurious, or another thread may change the queue before the waiter reacquires the mutex.

### Protecting queue updates

The producer and consumer check and update the queue while holding the mutex. `pthread_cond_wait` releases the mutex while the thread waits, then locks it again before returning. After changing the queue, the thread releases the mutex so the other one can proceed.

### Signaling shutdown

C does not have a built-in closed state for this queue. This example sends a special value, often called a poison pill, after the last task. The consumer treats it as a signal to exit rather than as work.

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
        
        // Check the condition again after each wakeup.
        while (queue.count == CAPACITY) {
            printf("[Producer] Queue full, backing off...\n");
            pthread_cond_wait(&queue.not_full, &queue.lock);
        }
        
        // The queue has space while the mutex is held.
        queue.buffer[queue.tail] = i;
        queue.tail = (queue.tail + 1) % CAPACITY;
        queue.count++;
        printf("[Producer] Pushed task %d\n", i);
        
        pthread_cond_signal(&queue.not_empty); // Signal consumer
        pthread_mutex_unlock(&queue.lock); // Release the queue lock.
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
        
        // The queue has an item while the mutex is held.
        int task = queue.buffer[queue.head];
        queue.head = (queue.head + 1) % CAPACITY;
        queue.count--;
        
        pthread_cond_signal(&queue.not_full); // Signal producer
        pthread_mutex_unlock(&queue.lock); 
        
        // Process tasks after releasing the queue lock.
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

## Go: Using a buffered channel

Go channels provide a simpler way to coordinate producers and consumers. A buffered channel acts as the queue, and the runtime handles waiting and waking goroutines.

### Waiting when the channel is full

Create a channel with `make(chan int, 3)` to give it room for three tasks. A send blocks when the channel is full and resumes when the consumer receives an item. While the sender waits, the runtime can schedule other goroutines. The program does not need to manage a mutex and condition-variable loop.

The channel takes care of synchronization. The program can rely on its behavior without depending on how the runtime implements it. As in the C example, the producer waits for space instead of repeatedly checking whether the queue is full.

### Closing a channel

Call `close` after the producer has sent all its values. A consumer's `for ... range` loop reads any remaining values, then exits. Sending to a closed channel or closing it a second time causes a panic.

### Letting the consumer finish

If the channel is never closed, the consumer waits indefinitely for another value. Closing it after the last send lets the consumer finish.

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

	wg.Add(1) // Track the consumer until it exits.
	go func() {
		defer wg.Done() // Mark the consumer complete when it exits.
		// The range ends after the channel is closed and drained.
		for task := range queue {
			fmt.Printf("[Consumer] Processed task %d\n", task)
			time.Sleep(100 * time.Millisecond) // Simulate work to trigger backpressure
		}
		fmt.Println("[Consumer] Shutdown signal received. Exiting.")
	}()

	for i := 1; i <= Tasks; i++ {
		fmt.Printf("[Producer] Pushing task %d...\n", i)
		queue <- i // Blocks while the channel is full.
	}

	close(queue) // Signal that no more tasks will be sent.

	// Wait for the consumer to finish.
	wg.Wait()
}
```

## Rust: Using a synchronous channel

Rust's `sync_channel` provides a bounded queue for threads. A send waits when the buffer is full, and the channel handles the coordination. Rust's ownership rules also help prevent unsynchronized access to shared data. The program still needs to handle shutdown and send failures.

### Passing the receiver to the consumer

The consumer thread takes ownership of the receiver. The main thread cannot use it after that; the compiler reports an error if it tries.

### Finishing after the last send

Rust does not have an explicit `close` call for this channel. When all senders are dropped, the receiver reads any buffered values and then finishes its iterator.

### Handling a failed send

The `.send()` method returns a `Result`. A send fails if the receiver has stopped. The caller must handle that result. This example uses `.unwrap()` because it expects the consumer to stay available until all tasks are sent.

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

    // Move the receiver into the consumer thread.
    let consumer = thread::spawn(move || {
        // The iterator ends after all senders are dropped.
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
        // Dropping the sender lets the receiver finish after draining the buffer.
    });

    producer.join().unwrap();
    consumer.join().unwrap();
}
```