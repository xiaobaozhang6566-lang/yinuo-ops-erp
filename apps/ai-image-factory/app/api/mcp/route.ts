import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import OpenAI from "openai";

export const runtime = "nodejs";

const allowedModels = {
  sunburst: process.env.IMAGE_MODEL_SUNBURST ?? "gpt-image-2.5-sunburst",
  flare: process.env.IMAGE_MODEL_FLARE ?? "gpt-image-2.5-flare"
} as const;

const handler = createMcpHandler((server) => {
  server.registerTool(
    "image_factory_status",
    {
      title: "Image Factory Status",
      description: "Check whether the Yinuo image factory is configured. Does not generate images or incur image API charges.",
      inputSchema: z.object({})
    },
    async () => ({
      content: [{
        type: "text",
        text: JSON.stringify({
          service: "yinuo-ai-image-factory",
          paidGenerationEnabled: process.env.IMAGE_FACTORY_ENABLE_PAID_GENERATION === "true",
          apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
          configuredModels: Object.values(allowedModels)
        })
      }]
    })
  );

  server.registerTool(
    "generate_product_image",
    {
      title: "Generate Product Image",
      description: "Generate one product image through the company's OpenAI API account. This is a paid action. Only call after the user explicitly asks to generate and confirms the task details. Model access must have been verified.",
      inputSchema: z.object({
        model: z.enum(["sunburst", "flare"]),
        prompt: z.string().min(10).max(8000),
        size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1536"),
        quality: z.enum(["low", "medium", "high"]).default("low"),
        count: z.number().int().min(1).max(1).default(1)
      })
    },
    async ({ model, prompt, size, quality }) => {
      if (process.env.IMAGE_FACTORY_ENABLE_PAID_GENERATION !== "true") {
        return { isError: true, content: [{ type: "text", text: "Paid image generation is disabled. Complete model access, budget, and storage acceptance first." }] };
      }
      if (!process.env.OPENAI_API_KEY) {
        return { isError: true, content: [{ type: "text", text: "OPENAI_API_KEY is not configured on the server." }] };
      }

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const modelId = allowedModels[model];
      const result = await client.images.generate({
        model: modelId,
        prompt,
        size,
        quality,
        n: 1
      });

      const image = result.data?.[0]?.b64_json;
      if (!image) {
        return { isError: true, content: [{ type: "text", text: "The image API returned no image payload." }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({
          status: "generated",
          model: modelId,
          size,
          quality,
          imageBase64: image,
          note: "Temporary response only. Private storage, final JPG resize, and cost ledger are not yet wired."
        }) }]
      };
    }
  );
});

export { handler as GET, handler as POST, handler as DELETE };
