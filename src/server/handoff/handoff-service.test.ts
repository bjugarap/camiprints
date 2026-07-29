import { beforeEach, describe, expect, it } from "vitest";

import {
  HANDOFF_LIMITS,
  handoffCreateResponseSchema,
  handoffRedeemRequestSchema,
  handoffTokenSchema,
} from "@/shared/contracts/extension-handoff";

import { InMemoryTemporaryPhotoStore } from "./in-memory-photo-store";
import {
  checkRateLimit,
  generateHandoffToken,
  HandoffRejection,
  HandoffService,
  sanitizeFilename,
  type DecodedImageInfo,
} from "./handoff-service";

const GOOD_DECODE: DecodedImageInfo = {
  format: "png",
  width: 800,
  height: 600,
};

function makeService(overrides: {
  decode?: () => Promise<DecodedImageInfo>;
  now?: () => number;
  store?: InMemoryTemporaryPhotoStore;
} = {}) {
  return new HandoffService({
    store: overrides.store ?? new InMemoryTemporaryPhotoStore(),
    decode: overrides.decode ?? (async () => GOOD_DECODE),
    now: overrides.now,
  });
}

const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]);

async function expectRejection(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  await expect(promise).rejects.toSatisfy(
    (error) => error instanceof HandoffRejection && error.code === code,
  );
}

// Fresh store per test — the in-memory registry lives on globalThis.
beforeEach(async () => {
  await new InMemoryTemporaryPhotoStore().sweep(Number.MAX_SAFE_INTEGER);
});

describe("token generation", () => {
  it("produces unique 43-char base64url tokens that match the contract", () => {
    const a = generateHandoffToken();
    const b = generateHandoffToken();
    expect(a).not.toBe(b);
    expect(handoffTokenSchema.safeParse(a).success).toBe(true);
    expect(handoffTokenSchema.safeParse(b).success).toBe(true);
  });
});

describe("create validation", () => {
  it("accepts a valid image and returns a token with expiry", async () => {
    const service = makeService({ now: () => 1_000_000 });
    const result = await service.create({
      bytes,
      claimedMimeType: "image/png",
      filename: "photo.png",
    });
    expect(handoffTokenSchema.safeParse(result.token).success).toBe(true);
    expect(new Date(result.expiresAt).getTime()).toBe(
      1_000_000 + HANDOFF_LIMITS.tokenTtlSeconds * 1000,
    );
  });

  it("rejects empty payloads, oversized files and bad MIME claims", async () => {
    const service = makeService();
    await expectRejection(
      service.create({ bytes: new Uint8Array(0), claimedMimeType: "image/png" }),
      "missing-image",
    );
    await expectRejection(
      service.create({
        bytes: new Uint8Array(HANDOFF_LIMITS.maxBytes + 1),
        claimedMimeType: "image/png",
      }),
      "file-too-large",
    );
    await expectRejection(
      service.create({ bytes, claimedMimeType: "image/gif" }),
      "unsupported-type",
    );
  });

  it("rejects bytes that fail to decode — the claimed MIME is not trusted", async () => {
    const service = makeService({
      decode: async () => {
        throw new Error("corrupt");
      },
    });
    await expectRejection(
      service.create({ bytes, claimedMimeType: "image/png" }),
      "invalid-image",
    );
  });

  it("rejects decoded formats outside the allowlist", async () => {
    const service = makeService({
      decode: async () => ({ format: "gif", width: 300, height: 300 }),
    });
    await expectRejection(
      service.create({ bytes, claimedMimeType: "image/png" }),
      "unsupported-type",
    );
  });

  it("rejects tiny, huge and bomb-sized dimensions", async () => {
    for (const size of [
      { width: 10, height: 10 },
      { width: 9000, height: 100 },
      { width: 7000, height: 7000 }, // 49MP > 40MP budget
    ]) {
      const service = makeService({
        decode: async () => ({ format: "jpeg", ...size }),
      });
      await expectRejection(
        service.create({ bytes, claimedMimeType: "image/jpeg" }),
        "invalid-image",
      );
    }
  });
});

describe("redemption", () => {
  it("redeems exactly once — replay gets null", async () => {
    const service = makeService();
    const { token } = await service.create({
      bytes,
      claimedMimeType: "image/png",
      filename: "photo.png",
    });
    const first = await service.redeem(token);
    expect(first?.mimeType).toBe("image/png");
    expect(first?.bytes).toEqual(bytes);
    expect(await service.redeem(token)).toBeNull();
  });

  it("expired tokens redeem as null, and the attempt burns them", async () => {
    let now = 0;
    const store = new InMemoryTemporaryPhotoStore();
    const service = makeService({ store, now: () => now });
    const { token } = await service.create({
      bytes,
      claimedMimeType: "image/png",
    });
    now = HANDOFF_LIMITS.tokenTtlSeconds * 1000 + 1;
    expect(await service.redeem(token)).toBeNull();
    now = 0; // even rewinding the clock cannot resurrect it
    expect(await service.redeem(token)).toBeNull();
  });

  it("unknown tokens redeem as null", async () => {
    expect(await makeService().redeem(generateHandoffToken())).toBeNull();
  });
});

describe("expiration sweep", () => {
  it("removes only expired records", async () => {
    const store = new InMemoryTemporaryPhotoStore();
    const record = {
      bytes,
      mimeType: "image/png",
      createdAt: 0,
      expiresAt: 100,
    };
    await store.put("old", record);
    await store.put("fresh", { ...record, expiresAt: 10_000 });
    expect(await store.sweep(5_000)).toBe(1);
    expect(await store.redeem("fresh", 5_000)).not.toBeNull();
  });
});

describe("filename sanitization", () => {
  it("strips paths and dangerous characters, caps length", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("C:\\Users\\x\\photo.png")).toBe("photo.png");
    expect(sanitizeFilename("we<i>rd\u0000name.jpg")).toBe("weirdname.jpg");
    expect(sanitizeFilename("a".repeat(200))!.length).toBe(80);
    expect(sanitizeFilename("///")).toBeUndefined();
    expect(sanitizeFilename(undefined)).toBeUndefined();
  });
});

describe("rate limiting", () => {
  it("allows up to the limit per window, then refuses, then resets", () => {
    const key = `test:${Math.random()}`;
    let now = 0;
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(key, { limit: 10, windowMs: 60_000, now })).toBe(
        true,
      );
    }
    expect(checkRateLimit(key, { limit: 10, windowMs: 60_000, now })).toBe(
      false,
    );
    now = 60_001;
    expect(checkRateLimit(key, { limit: 10, windowMs: 60_000, now })).toBe(
      true,
    );
  });
});

describe("contract schemas", () => {
  it("validate well-formed payloads and refuse malformed ones", () => {
    const token = generateHandoffToken();
    expect(
      handoffCreateResponseSchema.safeParse({
        version: "v1",
        token,
        expiresAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
    expect(
      handoffRedeemRequestSchema.safeParse({ version: "v1", token }).success,
    ).toBe(true);
    expect(
      handoffRedeemRequestSchema.safeParse({ version: "v2", token }).success,
    ).toBe(false);
    expect(
      handoffRedeemRequestSchema.safeParse({ version: "v1", token: "short" })
        .success,
    ).toBe(false);
    expect(
      handoffRedeemRequestSchema.safeParse({
        version: "v1",
        token: `${token.slice(0, 42)}!`,
      }).success,
    ).toBe(false);
  });
});
