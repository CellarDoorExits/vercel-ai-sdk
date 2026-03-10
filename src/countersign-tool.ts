/**
 * Vercel AI SDK tool for counter-signing EXIT markers.
 *
 * Counter-signing adds a witness attestation — a third party confirming
 * they observed the departure. The witness generates a fresh keypair,
 * signs (attestation + markerId + timestamp), and appends to marker.witnesses[].
 */

import { tool } from "ai";
import { z } from "zod";
import {
  fromJSON,
  toJSON,
  generateIdentity,
  canonicalize,
  sign,
  type ExitMarker,
  type WitnessAttachment,
} from "cellar-door-exit";

const countersignToolParams = z.object({
  markerJson: z
    .string()
    .describe("JSON string of the signed EXIT marker to counter-sign"),
  attestation: z
    .string()
    .optional()
    .describe("What the witness is attesting to. Defaults to 'Observed departure ceremony'."),
});

type CountersignToolInput = z.infer<typeof countersignToolParams>;

export interface CountersignToolResult {
  counterSignedMarkerJson: string;
  witnessDid: string;
  attestation: string;
  timestamp: string;
  markerId: string;
}

async function executeCountersign({ markerJson, attestation }: CountersignToolInput): Promise<CountersignToolResult> {
  const marker = fromJSON(markerJson) as ExitMarker;
  const identity = generateIdentity();
  const att = attestation ?? "Observed departure ceremony";
  const ts = new Date().toISOString();

  // Sign: attestation + markerId + timestamp
  const payload = new TextEncoder().encode(att + marker.id + ts);
  const sig = sign(payload, identity.privateKey);

  const witness: WitnessAttachment = {
    witnessDid: identity.did,
    attestation: att,
    timestamp: ts,
    signature: btoa(String.fromCharCode(...sig)),
    signatureType: "Ed25519Signature2020",
  };

  const updated = { ...marker, witnesses: [...(((marker as any).witnesses) ?? []), witness] };
  const updatedJson = toJSON(updated as ExitMarker);

  return {
    counterSignedMarkerJson: updatedJson,
    witnessDid: identity.did,
    attestation: att,
    timestamp: ts,
    markerId: marker.id,
  };
}

/**
 * Vercel AI SDK tool that counter-signs an EXIT marker as a witness.
 */
export const counterSignExitMarkerTool = tool<CountersignToolInput, CountersignToolResult>({
  description:
    "Counter-sign an EXIT marker as a witness. Generates a fresh identity, signs an attestation over the marker, and returns the updated marker with the witness signature appended.",
  inputSchema: countersignToolParams,
  execute: executeCountersign,
});

export { countersignToolParams };
