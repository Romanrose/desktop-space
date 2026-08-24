async function test() {
  const apiKey = "sk-cfdht6xdxvwbp2mu1pwf41da0ffwbd26ueuai4epxwxmmfbq";
  const baseUrl = "https://api.xiaomimimo.com/v1";
  const start = Date.now();
  try {
    const r = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        model: "mimo-v2.5",
        messages: [
          { role: "system", content: "You are Omega, a 19yo desktop pet. Reply briefly in Chinese, under 50 chars. Output JSON." },
          { role: "user", content: [
            { type: "text", text: "Hello! How are you today?\n\n[screen context] User is coding in VS Code." }
          ]}
        ],
        max_tokens: 200,
        response_format: { type: "json_object" }
      })
    });
    const data = await r.json();
    console.log("status:", r.status);
    console.log("elapsed:", Date.now() - start, "ms");
    console.log("content:", data?.choices?.[0]?.message?.content?.substring(0, 300));
  } catch(e) {
    console.log("error:", e.message);
  }
}
test();
