import type { Save } from "@/lib/types";

async function json<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Signed out");
  }
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

export async function listSaves(): Promise<Save[]> {
  return (await json<{ saves: Save[] }>(await fetch("/api/saves", { cache: "no-store" }))).saves;
}

export async function addSave(url: string): Promise<{ save: Save; created: boolean }> {
  return json(
    await fetch("/api/saves", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    }),
  );
}

export async function updateSave(id: string, fields: Partial<Save>): Promise<Save> {
  return (
    await json<{ save: Save }>(
      await fetch(`/api/saves/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields),
      }),
    )
  ).save;
}

export async function retrySave(id: string): Promise<void> {
  await json(await fetch(`/api/saves/${id}/retry`, { method: "POST" }));
}

export async function deleteSave(id: string): Promise<void> {
  const res = await fetch(`/api/saves/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
}
