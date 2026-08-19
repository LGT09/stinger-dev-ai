/** Fetches a remote media asset and saves it to the user's device. */
export async function downloadRemote(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = obj;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 4000);
  } catch {
    // Cross-origin blocked — open in a new tab so the user can save manually.
    window.open(url, "_blank", "noopener");
  }
}

export const safeName = (s: string, ext: string) =>
  `${(s || "stinger").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "stinger"}.${ext}`;
