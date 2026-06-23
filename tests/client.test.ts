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

    // The current request implementation doesn't actually populate pendingRequests.
    // To hit the lines in disconnect() we need to artificially populate it or use any trick.
    // For coverage, we can just inject into pendingRequests if it was accessible or we just
    // write a test knowing that the pendingRequests is not modified by request right now.
    // Ah, wait. Looking at client.ts:
    // async request(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    //   if (this.state !== "connected") {
    //     throw new Error(`Cannot send request in state '${this.state}'`);
    //   }
    //   const id = `req-${String(this.nextRequestId++).padStart(6, "0")}`;
    //   // Prototype: return mock response
    //   return { id, method, params, result: "ok" };
    // }
    // It doesn't put anything in pendingRequests! So pendingRequests is always empty.
    
    // So to cover lines 59-62:
    // for (const [id, req] of this.pendingRequests) {
    //   req.reject(new Error("Client disconnected"));
    //   this.pendingRequests.delete(id);
    // }
    // We would need a pendingRequest in the map. Since it's private, we can use an any cast.
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
