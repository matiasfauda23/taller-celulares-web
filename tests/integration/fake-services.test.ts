import { expect, it } from "vitest";
import { fakeNestResponse, FakeRedis } from "../helpers/fake-services";

it("keeps the integration doubles isolated from external services", () => {
  const redis = new FakeRedis();
  redis.set("sample", "value");
  expect(redis.get("sample")).toBe("value");
  expect(fakeNestResponse({ ok: true }).status).toBe(200);
});
