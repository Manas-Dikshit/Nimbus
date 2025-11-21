export async function checkout() {
  try {
    const res = await fetch("/api/checkout/vapor75", { method: "POST" });
    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
      // Try to surface helpful debugging info when the server returned HTML (e.g. static export 404)
      const text = await res.text();
      console.error("Checkout request failed:", res.status, text);
      return;
    }

    if (!contentType.includes("application/json")) {
      const text = await res.text();
      console.error("Expected JSON but received:", text);
      return;
    }

    const data = await res.json();
    if (data?.url) window.location.href = data.url;
  } catch (error) {
    console.error("Purchase Failed:", error);
  }
}
