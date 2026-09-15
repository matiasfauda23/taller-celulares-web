import "server-only";
import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";
import { getServerEnv } from "@/lib/config/server-env";
import type { SessionRecord, SessionStore } from "./store";

// No cjson in the Lua sandbox (real Redis has it, but ioredis-mock's fengari VM does not),
// so the record is stored as a hash and compared field-by-field instead of as a JSON blob.
const REPLACE_SCRIPT = `
local current = redis.call('HGET', KEYS[1], 'version')
if not current then return 0 end
if tostring(current) ~= ARGV[1] then return 0 end
redis.call('HSET', KEYS[1],
  'accountId', ARGV[2],
  'workshopId', ARGV[3],
  'accessToken', ARGV[4],
  'refreshToken', ARGV[5],
  'accessExpiresAt', ARGV[6],
  'refreshExpiresAt', ARGV[7],
  'version', ARGV[8])
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[9]))
return 1
`;

const RENEW_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[2]))
end
return 0
`;

const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

const sessionKey = (sessionId: string): string => `session:${sessionId}`;
const lockKey = (sessionId: string): string => `session-lock:${sessionId}`;

let sharedClient: Redis | undefined;

function defaultClient(): Redis {
  if (!sharedClient) {
    const { redisUrl } = getServerEnv();
    sharedClient = new Redis(redisUrl.toString(), {
      // Fail fast per-call instead of silently queueing commands while disconnected: a BFF
      // must never treat "Redis is unreachable" as "the session is valid".
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      commandTimeout: 2000,
      tls: redisUrl.protocol === "rediss:" ? {} : undefined,
    });
    sharedClient.on("error", () => {
      // Swallow here; every call site awaits a command and observes the rejection directly.
    });
  }
  return sharedClient;
}

interface StoredFields {
  accountId: string;
  workshopId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  version: string;
}

function toFields(record: SessionRecord): StoredFields {
  return {
    accountId: record.accountId,
    workshopId: record.workshopId,
    accessToken: record.accessToken,
    refreshToken: record.refreshToken,
    accessExpiresAt: String(record.accessExpiresAt),
    refreshExpiresAt: String(record.refreshExpiresAt),
    version: String(record.version),
  };
}

function fromFields(fields: Record<string, string>): SessionRecord | null {
  if (!fields.accountId) return null;
  return {
    accountId: fields.accountId,
    workshopId: fields.workshopId,
    accessToken: fields.accessToken,
    refreshToken: fields.refreshToken,
    accessExpiresAt: Number(fields.accessExpiresAt),
    refreshExpiresAt: Number(fields.refreshExpiresAt),
    version: Number(fields.version),
  };
}

export class RedisSessionStore implements SessionStore {
  constructor(private readonly redis: Redis = defaultClient()) {}

  async get(sessionId: string): Promise<SessionRecord | null> {
    const fields = await this.redis.hgetall(sessionKey(sessionId));
    if (Object.keys(fields).length === 0) return null;
    return fromFields(fields);
  }

  async create(sessionId: string, record: SessionRecord, ttlSeconds: number): Promise<void> {
    const key = sessionKey(sessionId);
    await this.redis.multi().hset(key, toFields(record)).expire(key, ttlSeconds).exec();
  }

  async replace(
    sessionId: string,
    record: SessionRecord,
    ttlSeconds: number,
    expectedVersion: number,
  ): Promise<boolean> {
    const fields = toFields(record);
    const result = await this.redis.eval(
      REPLACE_SCRIPT,
      1,
      sessionKey(sessionId),
      String(expectedVersion),
      fields.accountId,
      fields.workshopId,
      fields.accessToken,
      fields.refreshToken,
      fields.accessExpiresAt,
      fields.refreshExpiresAt,
      fields.version,
      String(ttlSeconds),
    );
    return result === 1;
  }

  async delete(sessionId: string): Promise<void> {
    await this.redis.del(sessionKey(sessionId));
  }

  async acquireLock(sessionId: string, ttlMs: number): Promise<string | null> {
    const token = randomUUID();
    const result = await this.redis.set(lockKey(sessionId), token, "PX", ttlMs, "NX");
    return result === "OK" ? token : null;
  }

  async renewLock(sessionId: string, token: string, ttlMs: number): Promise<boolean> {
    const result = await this.redis.eval(RENEW_LOCK_SCRIPT, 1, lockKey(sessionId), token, String(ttlMs));
    return result === 1;
  }

  async releaseLock(sessionId: string, token: string): Promise<void> {
    await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey(sessionId), token);
  }
}
