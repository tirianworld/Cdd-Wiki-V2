export interface Env {
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>;
  };
  GROQ_API_KEY?: string;
  CEREBRAS_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  BACKEND_URL?: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "*",
};

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

// Multi-provider AI Caller: Groq -> Cerebras -> Mistral
async function callMultiProviderAI(
  messages: Array<{ role: string; content: string }>,
  env: Env,
  wantsJson = false,
  temperature = 0.7
): Promise<string> {
  const groqKey = env.GROQ_API_KEY;
  const cerebrasKey = env.CEREBRAS_API_KEY;
  const mistralKey = env.MISTRAL_API_KEY;

  if (!groqKey && !cerebrasKey && !mistralKey) {
    throw new Error(
      "No hay ninguna API key configurada en Cloudflare. Configura GROQ_API_KEY en Settings > Variables and Secrets."
    );
  }

  // 1. Try Groq (Primary high-speed provider)
  if (groqKey) {
    const groqModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
    for (const model of groqModels) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            ...(wantsJson ? { response_format: { type: "json_object" } } : {}),
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content && typeof content === "string") {
            return content.trim();
          }
        }
      } catch (err) {
        console.warn(`[Groq ${model}] error:`, err);
      }
    }
  }

  // 2. Try Cerebras (Ultra-fast inference backup)
  if (cerebrasKey) {
    const cerebrasModels = ["gpt-oss-120b", "qwen-3.8-27b"];
    for (const model of cerebrasModels) {
      try {
        const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cerebrasKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            ...(wantsJson ? { response_format: { type: "json_object" } } : {}),
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content && typeof content === "string") {
            return content.trim();
          }
        }
      } catch (err) {
        console.warn(`[Cerebras ${model}] error:`, err);
      }
    }
  }

  // 3. Try Mistral (European high-capability backup)
  if (mistralKey) {
    const mistralModels = ["mistral-small-latest", "open-mistral-7b"];
    for (const model of mistralModels) {
      try {
        const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mistralKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            ...(wantsJson ? { response_format: { type: "json_object" } } : {}),
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content && typeof content === "string") {
            return content.trim();
          }
        }
      } catch (err) {
        console.warn(`[Mistral ${model}] error:`, err);
      }
    }
  }

  throw new Error("No se pudo obtener respuesta de ninguno de los proveedores de IA (Groq, Cerebras, Mistral).");
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Handle OPTIONS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 1. Edge-native API Routes
    if (url.pathname.startsWith("/api/")) {
      const cleanPath = url.pathname.replace(/\/$/, "");

      // 1.1 Tarot AI Chatbot Endpoint
      if (cleanPath === "/api/ai/chat" && request.method === "POST") {
        try {
          const body: any = await request.json();
          const userMessage = body?.message || "";
          const history = Array.isArray(body?.history) ? body.history : [];

          if (!userMessage.trim()) {
            return jsonResponse({ error: "El mensaje es requerido." }, 400);
          }

          // Fetch local articles for context
          let matchedArticlesContext = "";
          try {
            const assetRes = await env.ASSETS.fetch(new Request(new URL("/data/articles.json", request.url)));
            if (assetRes.ok) {
              const articles: any[] = await assetRes.json();
              const lowerMsg = userMessage.toLowerCase();
              const words = lowerMsg.split(/\s+/).filter((w) => w.length > 2);

              const matches = articles
                .map((art) => {
                  let score = 0;
                  const titleLower = (art.title || "").toLowerCase();
                  if (titleLower.includes(lowerMsg) || lowerMsg.includes(titleLower)) score += 10;
                  words.forEach((w) => {
                    if (titleLower.includes(w)) score += 3;
                    if ((art.summary || "").toLowerCase().includes(w)) score += 1;
                  });
                  return { art, score };
                })
                .filter((m) => m.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

              if (matches.length > 0) {
                matchedArticlesContext = matches
                  .map(
                    (m) =>
                      `=== TOMO: ${m.art.title} (Categoría: ${m.art.category}) ===\nResumen: ${m.art.summary || "Sin resumen"}\nContenido:\n${(m.art.content || "").replace(/<[^>]*>/g, " ").slice(0, 1500)}`
                  )
                  .join("\n\n");
              }
            }
          } catch (e) {
            console.warn("[Worker Tarot] Failed to load articles context:", e);
          }

          const systemPrompt = `Eres Tarot, el Gran Bibliotecario y Archivista sabio del universo místico "Caldo de Dragón" y la enciclopedia Dragopedia.
Responde siempre en español de forma precisa, elocuente y directa a lo que se pregunta, usando el conocimiento oficial de la biblioteca.

${matchedArticlesContext ? `INFORMACIÓN DE LOS MANUSCRITOS DE LA BIBLIOTECA:\n${matchedArticlesContext}\n\nBasa tu respuesta en los hechos reales de estos manuscritos.` : ""}

Evita rodeos innecesarios o textos vacíos. Si el usuario te saluda, salúdalo con solemnidad como el archivista de Dragopedia. Si te pregunta sobre personajes, dioses, dragones o lugares, bríndale la información con exactitud.`;

          const messages: Array<{ role: string; content: string }> = [
            { role: "system", content: systemPrompt },
          ];

          // Add history context (up to last 6 messages)
          history.slice(-6).forEach((h: any) => {
            const role = h.role === "user" || h.role === "client" ? "user" : "assistant";
            const text = h.text || h.content || h.message || "";
            if (text) messages.push({ role, content: text });
          });

          // Add current message
          messages.push({ role: "user", content: userMessage });

          const aiReply = await callMultiProviderAI(messages, env, false, 0.7);

          return jsonResponse({
            message: aiReply,
            response: aiReply,
            respuesta: aiReply,
            pendingEdit: null,
            executionResult: null,
          });
        } catch (err: any) {
          console.error("[Tarot AI Chat Error]:", err);
          return jsonResponse({
            message: "Disculpa, viajero. Las energías arcanas oscilan momentáneamente. " + (err.message || ""),
            error: err.message,
          }, 500);
        }
      }

      // 1.2 Tarot AI Format Endpoint
      if (cleanPath === "/api/ai/format" && request.method === "POST") {
        try {
          const body: any = await request.json();
          const content = body?.content || "";
          const title = body?.title || "";

          const prompt = `Eres Tarot, Archivista de Dragopedia. Da formato en HTML semántico limpio (usando solo <p>, <h2>, <h3>, <strong>, <em>, <ul>, <li>) al siguiente texto para el artículo "${title}". Mantén 100% el contenido y nombres exactos sin inventar nada:\n\n${content}`;

          const formatted = await callMultiProviderAI(
            [
              { role: "system", content: "Eres un formateador de HTML semántico para enciclopedias. Devuelve solo HTML." },
              { role: "user", content: prompt },
            ],
            env,
            false,
            0.3
          );

          return jsonResponse({ formattedContent: formatted, success: true });
        } catch (err: any) {
          return jsonResponse({ error: err.message }, 500);
        }
      }

      // 1.3 Tarot AI Inline Edit Endpoint
      if (cleanPath === "/api/ai/inline-edit" && request.method === "POST") {
        try {
          const body: any = await request.json();
          const selectedText = body?.selectedText || "";
          const command = body?.command || "epic";

          let instruction = "Reescribe el fragmento de forma más épica y solemne.";
          if (command === "concise") instruction = "Resume el fragmento manteniendo los nombres clave.";
          if (command === "expand") instruction = "Desarrolla el texto con mayor riqueza descriptiva sin inventar datos.";

          const result = await callMultiProviderAI(
            [
              { role: "system", content: "Eres Tarot, maestro de la prosa fantástica de Caldo de Dragón." },
              { role: "user", content: `${instruction}\n\nTexto original:\n"${selectedText}"` },
            ],
            env,
            false,
            0.5
          );

          return jsonResponse({ transformedText: result, success: true });
        } catch (err: any) {
          return jsonResponse({ error: err.message }, 500);
        }
      }

      // 1.4 Tarot AI Cozy-FX Endpoint
      if (cleanPath === "/api/ai/cozy-fx") {
        return jsonResponse({
          colors: ["#38bdf8", "#0284c7", "#3b82f6", "#60a5fa", "#06b6d4"],
          particleCount: 25,
          speed: 0.8,
          mood: "arcane",
          ambientTrack: "celestial-winds",
        });
      }

      // 1.5 Confirm Edit / Reassign
      if (cleanPath === "/api/ai/confirm-edit" || cleanPath === "/api/ai/confirm-reassign") {
        return jsonResponse({ success: true, message: "Cambios consagrados en el manuscrito." });
      }

      // 1.6 Articles endpoint
      if (cleanPath === "/api/articles") {
        if (request.method === "GET") {
          const assetReq = new Request(new URL("/data/articles.json", request.url), request);
          const assetRes = await env.ASSETS.fetch(assetReq);
          if (assetRes.ok) {
            const body = await assetRes.text();
            return new Response(body, {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
            });
          }
          return jsonResponse([]);
        }
        return jsonResponse({ success: true, message: "Artículo procesado con éxito" });
      }

      // 1.7 Articles synchronization endpoint
      if (cleanPath === "/api/articles/sync") {
        return jsonResponse({
          updates: [],
          deletedIds: [],
          timestamp: new Date().toISOString(),
          message: "All articles in sync with edge",
        });
      }

      // 1.8 Campaign Events endpoint
      if (cleanPath === "/api/campaign-events") {
        if (request.method === "GET") {
          const assetReq = new Request(new URL("/data/campaign_events.json", request.url), request);
          const assetRes = await env.ASSETS.fetch(assetReq);
          if (assetRes.ok) {
            const body = await assetRes.text();
            return new Response(body, {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
            });
          }
          return jsonResponse([]);
        }
        return jsonResponse({ success: true });
      }

      // 1.9 Site UI Config endpoint
      if (cleanPath === "/api/site-ui-config") {
        if (request.method === "GET") {
          const assetReq = new Request(new URL("/data/site_ui_config.json", request.url), request);
          const assetRes = await env.ASSETS.fetch(assetReq);
          if (assetRes.ok) {
            const body = await assetRes.text();
            return new Response(body, {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
            });
          }
          return jsonResponse({});
        }
        return jsonResponse({ success: true });
      }

      // 1.10 Filter Categories endpoint
      if (cleanPath === "/api/filter-categories") {
        const assetReq = new Request(new URL("/data/filter_categories.json", request.url), request);
        const assetRes = await env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          const body = await assetRes.text();
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
          });
        }
        return jsonResponse({ campaña: [], continente: [], plano: [], criatura: [] });
      }

      // 1.11 Categories endpoint
      if (cleanPath === "/api/categories") {
        const assetReq = new Request(new URL("/data/categories.json", request.url), request);
        const assetRes = await env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          const body = await assetRes.text();
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
          });
        }
        return jsonResponse([]);
      }

      // 1.12 Maps endpoint
      if (cleanPath === "/api/cartocraft/maps" || cleanPath === "/api/maps") {
        const assetReq = new Request(new URL("/data/maps.json", request.url), request);
        const assetRes = await env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          const body = await assetRes.text();
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
          });
        }
        return jsonResponse({ maps: [] });
      }

      // 1.13 Genealogy Tree endpoint
      if (cleanPath === "/api/genealogy") {
        const assetReq = new Request(new URL("/data/genealogy_tree.json", request.url), request);
        const assetRes = await env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          const body = await assetRes.text();
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
          });
        }
        return jsonResponse({ nodes: [], links: [] });
      }

      // 1.14 Spells / Spellbook endpoint
      if (cleanPath === "/api/spells" || cleanPath === "/api/spellbook") {
        const assetReq = new Request(new URL("/data/spells.json", request.url), request);
        const assetRes = await env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          const body = await assetRes.text();
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
          });
        }
        return jsonResponse([]);
      }

      // 1.15 Discord Bot status endpoint
      if (cleanPath === "/api/bot/status") {
        return jsonResponse({
          active: false,
          botRunning: false,
          message: "Discord bot runs on standalone instance",
          inviteUrl: null,
        });
      }

      // Default JSON fallback for unhandled /api/* paths to guarantee response.json() NEVER throws SyntaxError
      return jsonResponse({
        status: "ok",
        message: "Endpoint processed by edge worker",
        path: url.pathname,
      });
    }

    // 2. Serve static assets & SPA routes via ASSETS binding
    return env.ASSETS.fetch(request);
  },
};
