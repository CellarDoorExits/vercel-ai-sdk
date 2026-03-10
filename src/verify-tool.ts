/**
 * Vercel AI SDK tool for verifying EXIT markers.
 */

import { tool } from "ai";
import { z } from "zod";
import { quickVerify, type VerificationResult } from "cellar-door-exit";

const verifyToolParams = z.object({
  markerJson: z
    .string()
    .describe("JSON string of the EXIT marker to verify"),
});

type VerifyToolInput = z.infer<typeof verifyToolParams>;

export interface VerifyToolResult {
  valid: boolean;
  errors: string[];
  markerId?: string;
  subject?: string;
}

async function executeVerify({ markerJson }: VerifyToolInput): Promise<VerifyToolResult> {
  let markerId: string | undefined;
  let subject: string | undefined;
  try {
    const parsed = JSON.parse(markerJson);
    markerId = parsed.id;
    subject = parsed.subject;
  } catch {
    // will be caught by quickVerify too
  }

  try {
    const result: VerificationResult = quickVerify(markerJson);
    return {
      valid: result.valid,
      errors: result.errors ?? [],
      markerId,
      subject,
    };
  } catch (err) {
    return {
      valid: false,
      errors: [(err as Error).message],
      markerId,
      subject,
    };
  }
}

/**
 * Vercel AI SDK tool that verifies an EXIT marker's cryptographic signature and structure.
 */
export const verifyExitMarkerTool = tool<VerifyToolInput, VerifyToolResult>({
  description:
    "Verify a cryptographically signed EXIT marker. Checks the signature, structure, and integrity of the marker. Returns whether it is valid and any errors found.",
  inputSchema: verifyToolParams,
  execute: executeVerify,
});

export { verifyToolParams };
