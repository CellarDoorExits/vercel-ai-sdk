/**
 * Vercel AI SDK tool definition for creating EXIT markers.
 *
 * Usage with Vercel AI SDK:
 *   import { generateText } from 'ai';
 *   import { exitMarkerTool } from '@cellar-door/vercel-ai-sdk';
 *   const result = await generateText({ model, tools: { exitMarker: exitMarkerTool } });
 */

import { tool } from "ai";
import { z } from "zod";
import {
  quickExit,
  ExitType,
  toJSON,
  type QuickExitResult,
} from "cellar-door-exit";

/**
 * Vercel AI SDK tool that creates a signed EXIT marker.
 */
export const exitToolParams = z.object({
  origin: z
    .string()
    .describe("The platform or system being exited (e.g. 'openai-chat', 'slack-workspace')"),
  exitType: z
    .enum(["voluntary", "forced", "emergency", "keyCompromise"])
    .optional()
    .describe("Type of exit: voluntary, forced, emergency, or keyCompromise. Defaults to voluntary."),
  reason: z
    .string()
    .optional()
    .describe("Human-readable reason for departure"),
});

type ExitToolInput = z.infer<typeof exitToolParams>;

export interface ExitMarkerToolResult {
  markerJson: string;
  markerId: string;
  subject: string;
  origin: string;
  exitType: ExitType;
  timestamp: string;
}

async function executeExitTool({ origin, exitType, reason }: ExitToolInput): Promise<ExitMarkerToolResult> {
  const result: QuickExitResult = quickExit(origin, {
    exitType: exitType as ExitType | undefined,
    reason,
    ...(exitType === "emergency" ? { emergencyJustification: reason ?? "Emergency exit" } : {}),
  });

  return {
    markerJson: toJSON(result.marker),
    markerId: result.marker.id,
    subject: result.marker.subject,
    origin: result.marker.origin,
    exitType: result.marker.exitType,
    timestamp: result.marker.timestamp,
  };
}

export const exitMarkerTool = tool<ExitToolInput, ExitMarkerToolResult>({
  description:
    "Create a cryptographically signed EXIT departure marker. Use this when you are concluding a session, departing a platform, or need to produce a verifiable record of agent departure. Returns a signed marker as JSON.",
  inputSchema: exitToolParams,
  execute: executeExitTool,
});
