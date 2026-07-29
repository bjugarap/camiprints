"use client";

import Link from "next/link";
import { useState } from "react";

import {
  HANDOFF_VERSION,
  handoffCreateResponseSchema,
} from "@/shared/contracts/extension-handoff";
import { Button } from "@/shared/button";

/**
 * Drives the same two endpoints the extension will use: create a handoff
 * from a chosen file, open the deep link, and probe redemption twice to
 * demonstrate single-use behaviour. No separate mock implementation —
 * this exercises the production code path end to end.
 */
export function HandoffSimulator() {
  const [log, setLog] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const append = (line: string) => setLog((prev) => [...prev, line]);

  const create = async (file: File) => {
    setLog([]);
    setToken(null);
    const form = new FormData();
    form.set("version", HANDOFF_VERSION);
    form.set("image", file);
    const response = await fetch("/api/converter/handoffs", {
      method: "POST",
      body: form,
    });
    const body = await response.json();
    if (!response.ok) {
      append(`create → ${response.status}: ${JSON.stringify(body)}`);
      return;
    }
    const parsed = handoffCreateResponseSchema.safeParse(body);
    if (!parsed.success) {
      append(`create → 201 but response failed contract validation`);
      return;
    }
    setToken(parsed.data.token);
    setExpiresAt(parsed.data.expiresAt);
    append(`create → 201, token issued, expires ${parsed.data.expiresAt}`);
  };

  const redeem = async () => {
    if (!token) return;
    const response = await fetch("/api/converter/handoffs/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: HANDOFF_VERSION, token }),
    });
    if (response.ok) {
      const blob = await response.blob();
      append(`redeem → 200, ${blob.type}, ${blob.size} bytes`);
    } else {
      append(`redeem → ${response.status}: ${JSON.stringify(await response.json())}`);
    }
  };

  return (
    <div className="mx-auto max-w-[640px] px-4 py-10">
      <h1 className="text-page-title text-[30px]/[1.1] text-ink">
        Extension handoff simulator
      </h1>
      <p className="text-body mt-1.5 text-ink-60">
        Development only. Submits an image through the real handoff endpoint,
        then lets you open the converter deep link or probe replay behaviour.
      </p>

      <div className="mt-5 rounded-card border border-line bg-card p-4">
        <label className="text-base font-semibold text-ink" htmlFor="sim-file">
          1 · Pick an image (as the extension would)
        </label>
        <input
          id="sim-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 block w-full text-sm text-ink-60 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2.5 file:font-semibold file:text-white"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void create(file);
            event.target.value = "";
          }}
        />

        {token ? (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-base font-semibold text-ink">
              2 · Open the deep link
            </p>
            <p className="mt-1 break-all font-mono text-[12.5px] text-ink-40">
              /create/photo?handoff={token}
            </p>
            <p className="text-meta mt-1 text-ink-40">Expires {expiresAt}</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <Button asChild size="md">
                <Link href={`/create/photo?handoff=${token}`}>
                  Open converter
                </Link>
              </Button>
              <Button variant="secondary" size="md" onClick={() => void redeem()}>
                Redeem manually
              </Button>
              <Button variant="secondary" size="md" onClick={() => void redeem()}>
                Redeem again (replay test)
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {log.length > 0 ? (
        <pre className="mt-4 overflow-x-auto rounded-card border border-line bg-card p-4 font-mono text-[12.5px]/[1.7] text-ink-60">
          {log.join("\n")}
        </pre>
      ) : null}
    </div>
  );
}
