/**
 * Vercel AI SDK tools for ENTRY — verifiable arrival markers.
 */

import { tool } from "ai";
import { z } from "zod";
import {
  quickEntry,
  evaluateAdmission,
  verifyTransfer,
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

/**
 * Tool: verify an EXIT marker and create a signed arrival marker.
 */
export const verifyAndAdmitAgentTool = tool({
  description:
    "Verify an EXIT departure marker and create a signed arrival marker at this destination. " +
    "Wraps the full ENTRY flow: verify departure, evaluate admission, create arrival, check continuity.",
  parameters: z.object({
    exitMarkerJson: z
      .string()
      .describe("JSON string of the EXIT marker to verify and admit"),
    destination: z
      .string()
      .describe("Identifier for this platform/system (the arrival destination)"),
    admissionPolicy: z
      .enum(["OPEN_DOOR", "STRICT", "EMERGENCY_ONLY"])
      .optional()
      .describe("Admission policy preset to apply before admitting. Default: OPEN_DOOR"),
  }),
  execute: async ({ exitMarkerJson, destination, admissionPolicy }) => {
    // S-02 fix: default to OPEN_DOOR when policy is omitted (never skip checks entirely)
    const policyName = admissionPolicy ?? "OPEN_DOOR";
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
  },
});

/**
 * Tool: evaluate whether an EXIT marker meets an admission policy.
 */
export const evaluateAdmissionTool = tool({
  description:
    "Check whether an EXIT departure marker meets an admission policy. " +
    "Does NOT create an arrival — just evaluates the policy.",
  parameters: z.object({
    exitMarkerJson: z
      .string()
      .describe("JSON string of the EXIT marker to evaluate"),
    policy: z
      .enum(["OPEN_DOOR", "STRICT", "EMERGENCY_ONLY"])
      .describe("Admission policy preset to evaluate against"),
  }),
  execute: async ({ exitMarkerJson, policy: policyName }) => {
    const exitMarker = fromJSON(exitMarkerJson);
    const policy = admissionPresets[policyName];
    const result = evaluateAdmission(exitMarker, policy);

    return {
      admitted: result.admitted,
      conditions: result.conditions,
      reasons: result.reasons,
      policy: policyName,
    };
  },
});

/**
 * Tool: verify a complete EXIT→ENTRY transfer chain.
 */
export const verifyTransferTool = tool({
  description:
    "Verify a complete EXIT→ENTRY transfer: check both markers' signatures and continuity between them.",
  parameters: z.object({
    exitMarkerJson: z
      .string()
      .describe("JSON string of the EXIT marker"),
    arrivalMarkerJson: z
      .string()
      .describe("JSON string of the ARRIVAL marker"),
  }),
  execute: async ({ exitMarkerJson, arrivalMarkerJson }) => {
    const exitMarker = fromJSON(exitMarkerJson);
    let arrivalMarker: any;
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
    const record = verifyTransfer(exitMarker, arrivalMarker);

    return {
      verified: record.verified,
      transferTime: record.transferTime,
      errors: record.errors,
      continuity: record.continuity,
    };
  },
});

export type VerifyAndAdmitResult = Awaited<ReturnType<typeof verifyAndAdmitAgentTool.execute>>;
export type EvaluateAdmissionResult = Awaited<ReturnType<typeof evaluateAdmissionTool.execute>>;
export type VerifyTransferResult = Awaited<ReturnType<typeof verifyTransferTool.execute>>;
