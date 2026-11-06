"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TestPayButtons({
  id,
  token,
  next,
  payLabel,
  declineLabel,
}: {
  id: string;
  token: string;
  next: string;
  payLabel: string;
  declineLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "pay" | "fail">(null);

  async function send(success: boolean) {
    setBusy(success ? "pay" : "fail");
    await fetch(`/api/pay/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, success }),
    });
    if (success) router.replace(next);
    else {
      router.refresh();
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <button className="btn block" style={{ height: 52 }} disabled={!!busy} onClick={() => send(true)}>
        {busy === "pay" ? "…" : payLabel}
      </button>
      <button className="btn ghost block" disabled={!!busy} onClick={() => send(false)}>
        {declineLabel}
      </button>
    </div>
  );
}
