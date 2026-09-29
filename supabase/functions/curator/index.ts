// Curator stub. The live Pages build keeps the friendly placeholder.
// To turn the model on:
//   1. supabase secrets set XAI_API_KEY=...
//   2. supabase functions deploy curator
//   3. Point the curator page at this function and drop the placeholder.
// The key must stay a Supabase secret. It cannot ship in the static client.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const key = Deno.env.get("XAI_API_KEY")?.trim();
  const body = {
    ok: false,
    error: key
      ? "The curator function is deployed but the model call is still a stub. Wire api.x.ai from this function before removing the placeholder."
      : "Set the XAI_API_KEY secret on the curator function, then deploy it. The key cannot live in the Pages bundle.",
  };
  return new Response(JSON.stringify(body), {
    status: 501,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
