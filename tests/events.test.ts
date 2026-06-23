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
});
