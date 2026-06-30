import { describe, expect, it, vi } from "vitest";
import { PoiesisClient } from "../src/client.js";

describe("PoiesisClient (coverage-targeted)", () => {
  it("defaults optional config values when not provided", () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });

    const config = (client as unknown as { config: { reconnectIntervalMs: number; maxReconnectAttempts: number; timeoutMs: number; apiKey?: string } }).config;

    expect(config.reconnectIntervalMs).toBe(3000);
    expect(config.maxReconnectAttempts).toBe(5);
    expect(config.timeoutMs).toBe(10000);
    expect(config.apiKey).toBeUndefined();
  });

  it("preserves custom optional config values when provided", () => {
    const client = new PoiesisClient({
      endpoint: "ws://localhost:8080",
      apiKey: "test-key",
      reconnectIntervalMs: 150,
      maxReconnectAttempts: 2,
      timeoutMs: 5000,
    });

    const config = (client as unknown as { config: { reconnectIntervalMs: number; maxReconnectAttempts: number; timeoutMs: number; apiKey: string } }).config;

    expect(config.apiKey).toBe("test-key");
    expect(config.reconnectIntervalMs).toBe(150);
    expect(config.maxReconnectAttempts).toBe(2);
    expect(config.timeoutMs).toBe(5000);
  });

  it("generates incrementing request ids and preserves payload fields", async () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });
    await client.connect();

    const first = await client.request("getStatus", { scope: "status" });
    const second = await client.request("ping", { interval: 100 });

    expect(first).toMatchObject({
      id: "req-000001",
      method: "getStatus",
      params: { scope: "status" },
      result: "ok",
    });
    expect(second).toMatchObject({
      id: "req-000002",
      method: "ping",
      params: { interval: 100 },
      result: "ok",
    });
  });

  it("defaults request params to an empty object", async () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });
    await client.connect();

    const response = await client.request("getStatus");

    expect((response as { params: Record<string, unknown> }).params).toEqual({});
  });

  it("rejects all pending requests when disconnecting", async () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });
    await client.connect();

    const reject = vi.fn();
    (client as unknown as { pendingRequests: Map<string, { reject: (error: Error) => void }> }).pendingRequests.set("req-001", {
      reject,
      resolve: () => {},
      id: "req-001",
      method: "test",
      sentAt: Date.now(),
    });

    expect(client.pendingCount).toBe(1);
    await client.disconnect();
    expect(reject).toHaveBeenCalledWith(expect.any(Error));
    expect((reject.mock.calls[0]?.[0] as Error).message).toBe("Client disconnected");
    expect(client.pendingCount).toBe(0);
  });
});
