import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Refill all users: free=1000, pro=5000
    // Get all profiles
    const { data: profiles } = await supabase.from("profiles").select("user_id, plan, email");
    if (!profiles) throw new Error("No profiles found");

    let refilled = 0;
    for (const p of profiles) {
      const amount = p.email === "traxxiontech@gmail.com" ? 10000 : p.plan === "pro" ? 5000 : 1000;
      await supabase.from("token_balances").update({ balance: amount }).eq("user_id", p.user_id);
      await supabase.from("token_transactions").insert({
        user_id: p.user_id,
        amount,
        action: "Monthly refill",
        description: `Auto-refilled to ${amount} tokens`,
      });
      refilled++;
    }

    return new Response(JSON.stringify({ success: true, refilled }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Monthly refill error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
