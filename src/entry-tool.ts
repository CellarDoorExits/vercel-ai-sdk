/**
 * Factory-style Vercel AI SDK tools for ENTRY (admission).
 *
 * Unlike the static tools in entry-tools.ts, these let you bake in
 * platform identity and admission policy at construction time.
 *
 * Usage:
 *   import { createEntryTool, createPassageTool } from '@cellar-door/vercel-ai-sdk';
 *   const entryTool = createEntryTool({ destination: 'my-platform', policy: 'OPEN_DOOR' });
 *   const passageTool = createPassageTool({ origin: 'source', destination: 'my-platform' });
 */

import { tool } from "ai";
import { z } from "zod";
import {
  quickEntry,
  evaluateAdmission,
  OPEN_DOOR,
  STRICT,
  EMERGENCY_ONLY,
  type AdmissionPolicy,
  type QuickEntryResult,
} from "cellar-door-entry";
import {
  quickExit,
  toJSON,
  fromJSON,
  ExitType,
} from "cellar-door-exit";

// ─── Policy presets ─────────────────────────────────────────────────────────

const POLICY_PRESETS: Record<string, AdmissionPolicy> = {
  OPEN_DOOR,
  CAUTIOUS: STRICT,   // CAUTIOUS maps to STRICT (the safe default)
  STRICT,
  EMERGENCY_ONLY,
};

type PolicyName = "OPEN_DOOR" | "CAUTIOUS" | "STRICT" | "EMERGENCY_ONLY";

// ─── createEntryTool ────────────────────────────────────────────────────────

export interface EntryToolOpts {
  /** Destination platform/system identifier */
  destination: string;
  /** Admission policy preset (default: CAUTIOUS) */
  policy?: PolicyName;
  /** Override the tool description */
  description?: string;
}

export interface EntryToolResult {
  admitted: boolean;
  reasons: string[];
  arrivalMarkerJson: string | null;
  exitMarkerId: string | null;
  subject: string | null;
  destination: string | null;
}

/**
 * Create a Vercel AI tool that admits an agent by verifying an exit marker
 * and creating an arrival at the configured destination.
 */
export function createEntryTool(opts: EntryToolOpts) {
  const policyName = opts.policy ?? "CAUTIOUS";
  const policy = POLICY_PRESETS[policyName];
  if (!policy) {
    throw new Error(`Unknown admission policy: ${policyName}`);
  }

  const inputSchema = z.object({
    exitMarkerJson: z
      .string()
      .describe("JSON string of the EXIT departure marker to verify and admit"),
  });

  return tool({
    description:
      opts.description ??
      `Verify an EXIT marker and admit the agent to ${opts.destination}. ` +
        `Policy: ${policyName}. Returns admission result with arrival marker.`,
    inputSchema,
    execute: async ({ exitMarkerJson }): Promise<EntryToolResult> => {
      const exitMarker = fromJSON(exitMarkerJson);
      const admission = evaluateAdmission(exitMarker, policy);

      if (!admission.admitted) {
        return {
          admitted: false,
          reasons: admission.reasons,
          arrivalMarkerJson: null,
          exitMarkerId: null,
          subject: null,
          destination: null,
        };
      }

      const result: QuickEntryResult = quickEntry(exitMarkerJson, opts.destination);

      return {
        admitted: true,
        reasons: [],
        arrivalMarkerJson: JSON.stringify(result.arrivalMarker),
        exitMarkerId: result.exitMarker.id,
        subject: result.arrivalMarker.subject,
        destination: result.arrivalMarker.destination,
      };
    },
  });
}

// ─── createPassageTool ──────────────────────────────────────────────────────

export interface PassageToolOpts {
  /** Origin platform (where the exit happens) */
  origin: string;
  /** Destination platform (where the arrival happens) */
  destination: string;
  /** Exit type (default: voluntary) */
  exitType?: ExitType;
  /** Admission policy at the destination (default: CAUTIOUS) */
  policy?: PolicyName;
  /** Override the tool description */
  description?: string;
}

export interface PassageToolResult {
  exitMarkerJson: string;
  exitMarkerId: string;
  admitted: boolean;
  reasons: string[];
  arrivalMarkerJson: string | null;
  subject: string;
  origin: string;
  destination: string;
}

/**
 * Create a Vercel AI tool that performs a full passage: exit at origin,
 * then admit at destination, in one step.
 */
export function createPassageTool(opts: PassageToolOpts) {
  const policyName = opts.policy ?? "CAUTIOUS";
  const policy = POLICY_PRESETS[policyName];
  if (!policy) {
    throw new Error(`Unknown admission policy: ${policyName}`);
  }

  const inputSchema = z.object({
    reason: z
      .string()
      .optional()
      .describe("Reason for the passage/transfer"),
  });

  return tool({
    description:
      opts.description ??
      `Perform a full passage: exit ${opts.origin} and arrive at ${opts.destination}. ` +
        `Creates both EXIT and ARRIVAL markers in one step. Policy: ${policyName}.`,
    inputSchema,
    execute: async ({ reason }): Promise<PassageToolResult> => {
      // Step 1: Exit at origin
      const exitResult = await quickExit(opts.origin, {
        exitType: opts.exitType ?? ExitType.Voluntary,
        reason,
      });
      const exitJson = toJSON(exitResult.marker);

      // Step 2: Evaluate admission at destination
      const admission = evaluateAdmission(exitResult.marker, policy);

      if (!admission.admitted) {
        return {
          exitMarkerJson: exitJson,
          exitMarkerId: exitResult.marker.id,
          admitted: false,
          reasons: admission.reasons,
          arrivalMarkerJson: null,
          subject: exitResult.marker.subject,
          origin: opts.origin,
          destination: opts.destination,
        };
      }

      // Step 3: Create arrival at destination
      const entryResult: QuickEntryResult = quickEntry(exitJson, opts.destination);

      return {
        exitMarkerJson: exitJson,
        exitMarkerId: exitResult.marker.id,
        admitted: true,
        reasons: [],
        arrivalMarkerJson: JSON.stringify(entryResult.arrivalMarker),
        subject: exitResult.marker.subject,
        origin: opts.origin,
        destination: opts.destination,
      };
    },
  });
}
