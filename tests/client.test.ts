import { describe, it, expect } from "vitest";
import { PoiesisClient } from "../src/client.js";

describe("PoiesisClient", () => {
  it("should start in disconnected state", () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });
    expect(client.connectionState).toBe("disconnected");
  });

  it("should connect successfully", async () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });
    await client.connect();
    expect(client.connectionState).toBe("connected");
  });

  it("should not reconnect if already connected", async () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });
    await client.connect();
    expect(client.connectionState).toBe("connected");
    await client.connect();
    expect(client.connectionState).toBe("connected");
  });

  it("should send requests when connected", async () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });
    await client.connect();
    const response = await client.request("getStatus");
    expect(response).toBeDefined();
  });

  it("should reject requests when disconnected", async () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });
    await expect(client.request("getStatus")).rejects.toThrow("Cannot send request");
  });

  it("should disconnect cleanly", async () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });
    await client.connect();
    await client.disconnect();
    expect(client.connectionState).toBe("disconnected");
  });

  it("should return the configured endpoint", () => {
    const endpoint = "ws://localhost:8080";
    const client = new PoiesisClient({ endpoint });
    expect(client.endpoint).toBe(endpoint);
  });

  it("should return pendingCount 0 initially", () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });
    expect(client.pendingCount).toBe(0);
  });

  it("should reject pending requests on disconnect", async () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });
    await client.connect();

    (client as any).pendingRequests.set("req-123", {
      id: "req-123",
      method: "test",
      sentAt: Date.now(),
      resolve: () => {},
      reject: (e: Error) => {
        expect(e.message).toBe("Client disconnected");
      }
    });

    expect(client.pendingCount).toBe(1);

    await client.disconnect();

    expect(client.pendingCount).toBe(0);
  });
});
