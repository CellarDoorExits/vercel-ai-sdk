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
export const exitMarkerTool = tool({
  description:
    "Create a cryptographically signed EXIT departure marker. Use this when you are concluding a session, departing a platform, or need to produce a verifiable record of agent departure. Returns a signed marker as JSON.",
  parameters: z.object({
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
  }),
  execute: async ({ origin, exitType, reason }: { origin: string; exitType?: string; reason?: string }) => {
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
  },
});

export type ExitMarkerToolResult = Awaited<ReturnType<typeof exitMarkerTool.execute>>;
