import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { registerTrackerTools } from "@/lib/mcp/server";

/**
 * MCP endpoint (Streamable HTTP). Clients authenticate with a personal API key
 * created on the dashboard: `Authorization: Bearer yaft_…`.
 */
const handler = createMcpHandler(registerTrackerTools, {
  serverInfo: { name: "cspx-tracker", version: "0.1.0" },
});

async function verifyToken(
  _req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!bearerToken || !convexUrl) return undefined;

  const result = await new ConvexHttpClient(convexUrl).mutation(
    api.apiKeys.verifyApiKey,
    { apiKey: bearerToken }
  );
  if (!result) return undefined;

  return {
    token: bearerToken,
    clientId: result.keyId,
    scopes: [],
  };
}

const authHandler = withMcpAuth(handler, verifyToken, { required: true });

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
