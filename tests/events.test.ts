import { describe, it, expect } from "vitest";
import { EventBus } from "../src/events.js";

describe("EventBus", () => {
  it("should deliver events to subscribers", () => {
    const bus = new EventBus();
    const received: string[] = [];
    bus.on<string>("test", (payload) => received.push(payload.data));
    bus.emit("test", "hello");
    expect(received).toEqual(["hello"]);
  });

  it("should return unsubscribe function", () => {
    const bus = new EventBus();
    const received: number[] = [];
    const unsub = bus.on<number>("count", (p) => received.push(p.data));
    bus.emit("count", 1);
    unsub();
    bus.emit("count", 2);
    expect(received).toEqual([1]);
  });
  
  it("unsubscribe function safely handles cleared handlers", () => {
    const bus = new EventBus();
    const unsub = bus.on("test", () => {});
    bus.clear();
    // This will hit the `this.handlers.get(eventType) ?? []` fallback in the unsub function
    unsub();
    expect(bus.registeredTypes).toBe(1); // Because unsub() re-adds an empty array when it filters
  });

  it("should maintain event history", () => {
    const bus = new EventBus();
    bus.emit("a", 1);
    bus.emit("b", 2);
    bus.emit("a", 3);
    expect(bus.getHistory("a")).toHaveLength(2);
    expect(bus.getHistory()).toHaveLength(3);
  });

  it("should respect maxHistory limit", () => {
    const bus = new EventBus(3);
    bus.emit("x", 1);
    bus.emit("x", 2);
    bus.emit("x", 3);
    bus.emit("x", 4);
    expect(bus.getHistory()).toHaveLength(3);
  });

  it("should clear handlers", () => {
    const bus = new EventBus();
    bus.on("a", () => {});
    bus.on("b", () => {});
    expect(bus.registeredTypes).toBe(2);
    bus.clear("a");
    expect(bus.registeredTypes).toBe(1);
    
    // clear all handlers
    bus.clear();
    expect(bus.registeredTypes).toBe(0);
  });

  it("should return zero invocations when no subscribers exist", () => {
    const bus = new EventBus();
    const invoked = bus.emit("ghost", "nothing");
    expect(invoked).toBe(0);
  });

  it("should invoke multiple handlers in registration order and return count", () => {
    const bus = new EventBus();
    const calls: string[] = [];

    bus.on("count", (payload) => calls.push(`first:${payload.data}`));
    bus.on("count", (payload) => calls.push(`second:${payload.data}`));
    const invoked = bus.emit("count", 7);

    expect(calls).toEqual(["first:7", "second:7"]);
    expect(invoked).toBe(2);
  });

  it("should isolate event types and only invoke matching handlers", () => {
    const bus = new EventBus();
    const calls: string[] = [];

    bus.on<string>("same", () => calls.push("same"));
    bus.on<string>("other", () => calls.push("other"));
    bus.clear("other");

    bus.emit("same", "payload");
    expect(calls).toEqual(["same"]);
  });

  it("should allow one handler removal without affecting others", () => {
    const bus = new EventBus();
    const calls: number[] = [];

    const unsubscribeFirst = bus.on<number>("numbers", (payload) => calls.push(payload.data * 2));
    bus.on<number>("numbers", (payload) => calls.push(payload.data * 3));

    bus.emit("numbers", 5);
    unsubscribeFirst();
    bus.emit("numbers", 7);

    expect(calls).toEqual([10, 15, 21]);
  });

  it("should keep history bounded without mutating returned history snapshots", () => {
    const bus = new EventBus(2);
    bus.emit("a", 1);
    bus.emit("a", 2);
    bus.emit("a", 3);

    const snap = bus.getHistory("a");
    expect(snap).toHaveLength(2);
    snap.pop();
    expect(bus.getHistory("a")).toHaveLength(2);
    expect(bus.getHistory()).toHaveLength(2);
  });

  it("should emit payload with timestamp and source metadata", () => {
    const bus = new EventBus();
    const now = Date.now();
    const payloads: Array<{ type: string; data: number; source: string; timestamp: number }> = [];

    bus.on<number>("meta", (payload) => payloads.push(payload));
    bus.emit("meta", 42, "test-suite");

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({
      type: "meta",
      data: 42,
      source: "test-suite",
    });
    expect(payloads[0].timestamp).toBeGreaterThanOrEqual(now);
  });
});
