/**
 * Vercel AI SDK tools for ENTRY — verifiable arrival markers.
 */

import { tool } from "ai";
import { z } from "zod";
import {
  quickEntry,
  evaluateAdmission,
  verifyTransfer,
  validateArrivalMarker,
  MAX_MARKER_SIZE,
  OPEN_DOOR,
  STRICT,
  EMERGENCY_ONLY,
  type AdmissionPolicy,
  type QuickEntryResult,
} from "cellar-door-entry";
import { fromJSON } from "cellar-door-exit";

const admissionPresets: Record<string, AdmissionPolicy> = {
  OPEN_DOOR,
  STRICT,
  EMERGENCY_ONLY,
};

// ─── Schemas ────────────────────────────────────────────────────────────────

const verifyAndAdmitParams = z.object({
  exitMarkerJson: z
    .string()
    .describe("JSON string of the EXIT marker to verify and admit"),
  destination: z
    .string()
    .describe("Identifier for this platform/system (the arrival destination)"),
  admissionPolicy: z
    .enum(["OPEN_DOOR", "STRICT", "EMERGENCY_ONLY"])
    .optional()
    .describe("Admission policy preset to apply before admitting. Default: STRICT"),
});

const evaluateAdmissionParams = z.object({
  exitMarkerJson: z
    .string()
    .describe("JSON string of the EXIT marker to evaluate"),
  policy: z
    .enum(["OPEN_DOOR", "STRICT", "EMERGENCY_ONLY"])
    .describe("Admission policy preset to evaluate against"),
});

const verifyTransferParams = z.object({
  exitMarkerJson: z
    .string()
    .describe("JSON string of the EXIT marker"),
  arrivalMarkerJson: z
    .string()
    .describe("JSON string of the ARRIVAL marker"),
});

// ─── Types ──────────────────────────────────────────────────────────────────

type VerifyAndAdmitInput = z.infer<typeof verifyAndAdmitParams>;
type EvaluateAdmissionInput = z.infer<typeof evaluateAdmissionParams>;
type VerifyTransferInput = z.infer<typeof verifyTransferParams>;

export interface VerifyAndAdmitResult {
  admitted: boolean;
  reasons?: string[];
  arrivalMarker: any;
  exitMarkerId?: string;
  subject?: string;
  destination?: string;
  continuity?: any;
}

export interface EvaluateAdmissionResult {
  admitted: boolean;
  conditions: string[];
  reasons: string[];
  policy: string;
}

export interface VerifyTransferResult {
  verified: boolean;
  transferTime: number | null;
  errors: string[];
  continuity: any;
}

// ─── Execute functions ──────────────────────────────────────────────────────

async function executeVerifyAndAdmit({ exitMarkerJson, destination, admissionPolicy }: VerifyAndAdmitInput): Promise<VerifyAndAdmitResult> {
  // PCR-39: Default to STRICT — never OPEN_DOOR — because an LLM can freely
  // choose the most permissive policy or omit it entirely.
  const policyName = admissionPolicy ?? "STRICT";
  const policy = admissionPresets[policyName];
  const exitMarker = fromJSON(exitMarkerJson);
  const admission = evaluateAdmission(exitMarker, policy);
  if (!admission.admitted) {
    return {
      admitted: false,
      reasons: admission.reasons,
      arrivalMarker: null,
    };
  }

  const result: QuickEntryResult = quickEntry(exitMarkerJson, destination);

  return {
    admitted: true,
    arrivalMarker: JSON.parse(JSON.stringify(result.arrivalMarker)),
    exitMarkerId: result.exitMarker.id,
    subject: result.arrivalMarker.subject,
    destination: result.arrivalMarker.destination,
    continuity: result.continuity,
  };
}

async function executeEvaluateAdmission({ exitMarkerJson, policy: policyName }: EvaluateAdmissionInput): Promise<EvaluateAdmissionResult> {
  const exitMarker = fromJSON(exitMarkerJson);
  const policy = admissionPresets[policyName];
  const result = evaluateAdmission(exitMarker, policy);

  return {
    admitted: result.admitted,
    conditions: result.conditions,
    reasons: result.reasons,
    policy: policyName,
  };
}

async function executeVerifyTransfer({ exitMarkerJson, arrivalMarkerJson }: VerifyTransferInput): Promise<VerifyTransferResult> {
  const exitMarker = fromJSON(exitMarkerJson);
  let arrivalMarker: any;

  // S-05: Validate arrival marker with size limits and structural checks
  if (arrivalMarkerJson.length > MAX_MARKER_SIZE) {
    return {
      verified: false,
      transferTime: null,
      errors: [`Arrival marker JSON too large: ${arrivalMarkerJson.length} bytes (max ${MAX_MARKER_SIZE})`],
      continuity: null,
    };
  }

  try {
    arrivalMarker = JSON.parse(arrivalMarkerJson);
  } catch {
    return {
      verified: false,
      transferTime: null,
      errors: ["Invalid arrival marker JSON: failed to parse"],
      continuity: null,
    };
  }

  const validation = validateArrivalMarker(arrivalMarker);
  if (!validation.valid) {
    return {
      verified: false,
      transferTime: null,
      errors: validation.errors.map((e: string) => `VALIDATION: ${e}`),
      continuity: null,
    };
  }
  const record = verifyTransfer(exitMarker, arrivalMarker);

  return {
    verified: record.verified,
    transferTime: record.transferTime,
    errors: record.errors,
    continuity: record.continuity,
  };
}

// ─── Tool definitions ───────────────────────────────────────────────────────

/**
 * Tool: verify an EXIT marker and create a signed arrival marker.
 */
export const verifyAndAdmitAgentTool = tool<VerifyAndAdmitInput, VerifyAndAdmitResult>({
  description:
    "Verify an EXIT departure marker and create a signed arrival marker at this destination. " +
    "Wraps the full ENTRY flow: verify departure, evaluate admission, create arrival, check continuity.",
  inputSchema: verifyAndAdmitParams,
  execute: executeVerifyAndAdmit,
});

/**
 * Tool: evaluate whether an EXIT marker meets an admission policy.
 */
export const evaluateAdmissionTool = tool<EvaluateAdmissionInput, EvaluateAdmissionResult>({
  description:
    "Check whether an EXIT departure marker meets an admission policy. " +
    "Does NOT create an arrival — just evaluates the policy.",
  inputSchema: evaluateAdmissionParams,
  execute: executeEvaluateAdmission,
});

/**
 * Tool: verify a complete EXIT→ENTRY transfer chain.
 */
export const verifyTransferTool = tool<VerifyTransferInput, VerifyTransferResult>({
  description:
    "Verify a complete EXIT→ENTRY transfer: check both markers' signatures and continuity between them.",
  inputSchema: verifyTransferParams,
  execute: executeVerifyTransfer,
});
