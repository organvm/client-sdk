import { describe, expect, it } from "vitest";
import { PoiesisClient } from "../src/client.js";

describe("PoiesisClient lifecycle", () => {
  it("rejects requests after disconnecting from an active session", async () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });

    await client.connect();
    await client.request("beforeDisconnect");
    await client.disconnect();

    await expect(client.request("afterDisconnect")).rejects.toThrow(
      "Cannot send request in state 'disconnected'"
    );
    expect(client.connectionState).toBe("disconnected");
    expect(client.pendingCount).toBe(0);
  });

  it("can reconnect after disconnecting and keeps request correlation ids monotonic", async () => {
    const client = new PoiesisClient({ endpoint: "ws://localhost:8080" });

    await client.connect();
    const first = await client.request("first");
    await client.disconnect();
    await client.connect();
    const second = await client.request("second", { resumed: true });

    expect(first).toMatchObject({
      id: "req-000001",
      method: "first",
      params: {},
      result: "ok",
    });
    expect(second).toMatchObject({
      id: "req-000002",
      method: "second",
      params: { resumed: true },
      result: "ok",
    });
    expect(client.connectionState).toBe("connected");
  });
});
