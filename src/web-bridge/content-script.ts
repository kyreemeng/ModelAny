import { parseWebsiteLaunchRequest, WEBSITE_ORIGIN } from "./protocol";

const respond = (nonce: string, result: { status: "accepted" | "rejected"; modelCount?: number; autoSubmit?: boolean; message?: string }) => {
  window.postMessage({ type: "MODELANY_LAUNCH_RESULT", nonce, ...result }, WEBSITE_ORIGIN);
};

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (event.source !== window || event.origin !== WEBSITE_ORIGIN) return;
  const request = parseWebsiteLaunchRequest(event.data);
  if (!request) return;

  const nonce = (event.data as { nonce: string }).nonce;
  void chrome.runtime.sendMessage({ type: "WEB_LAUNCH", nonce, request })
    .then((result: { ok?: boolean; error?: string } | undefined) => {
      if (!result?.ok) {
        respond(nonce, { status: "rejected", message: result?.error ?? "The extension rejected this request." });
        return;
      }
      respond(nonce, { status: "accepted", modelCount: request.modelIds.length, autoSubmit: request.autoSubmit });
    })
    .catch(() => respond(nonce, { status: "rejected", message: "The extension is unavailable." }));
});
