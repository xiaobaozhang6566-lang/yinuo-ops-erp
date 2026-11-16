export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    service: "yinuo-ai-image-factory",
    version: "0.1.0",
    status: "scaffold_ready",
    paidGenerationEnabled: false
  });
}
