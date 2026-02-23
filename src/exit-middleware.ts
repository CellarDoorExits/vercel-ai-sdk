/**
 * Middleware / callback for automatic EXIT marker creation
 * when a Vercel AI SDK agent session ends.
 *
 * Plugs into the `onFinish` callback of `generateText` or `streamText`.
 */

import {
  quickExit,
  toJSON,
  ExitType,
  type ExitMarker,
  type Identity,
} from "cellar-door-exit";
import {
  quickEntry,
  type QuickEntryResult,
  type ArrivalMarker,
} from "cellar-door-entry";

export interface ExitMiddlewareOpts {
  /** Platform/system identifier */
  origin: string;
  /** Exit type (defaults to Voluntary) */
  exitType?: ExitType;
  /** Called with the signed marker after creation */
  onMarkerCreated?: (marker: ExitMarker, identity: Identity) => void | Promise<void>;
  /** If true, include the marker JSON in the returned metadata */
  includeInMetadata?: boolean;
}

export interface EntryMiddlewareOpts {
  /** Destination platform/system identifier */
  destination: string;
  /** Called with the arrival marker after creation */
  onArrivalCreated?: (arrival: ArrivalMarker, exit: ExitMarker) => void | Promise<void>;
  /** If true, include arrival marker JSON in returned metadata */
  includeInMetadata?: boolean;
}

export interface TransitMiddlewareOpts extends ExitMiddlewareOpts {
  /** If provided, also create an arrival marker at this destination */
  arrivalDestination?: string;
  /** Called with the arrival marker */
  onArrivalCreated?: (arrival: ArrivalMarker, exit: ExitMarker) => void | Promise<void>;
}

/**
 * Creates an `onFinish` callback that automatically generates
 * a signed EXIT marker when an AI SDK call completes.
 *
 * @example
 * ```ts
 * import { streamText } from 'ai';
 * import { createExitOnFinish } from '@cellar-door/vercel-ai-sdk';
 *
 * const result = await streamText({
 *   model,
 *   prompt: 'Hello',
 *   onFinish: createExitOnFinish({ origin: 'my-agent' }),
 * });
 * ```
 */
export function createExitOnFinish(opts: ExitMiddlewareOpts) {
  return async (event: { text: string; [key: string]: unknown }) => {
    const { marker, identity } = quickExit(opts.origin, {
      exitType: opts.exitType ?? ExitType.Voluntary,
    });

    if (opts.onMarkerCreated) {
      await opts.onMarkerCreated(marker, identity);
    }

    return {
      exitMarker: opts.includeInMetadata !== false ? toJSON(marker) : undefined,
      exitMarkerId: marker.id,
    };
  };
}

/**
 * Wraps any onFinish callback to also produce an EXIT marker.
 */
export function withExitMarker<T extends (...args: any[]) => any>(
  originalOnFinish: T | undefined,
  opts: ExitMiddlewareOpts,
): (...args: Parameters<T>) => Promise<void> {
  return async (...args: Parameters<T>) => {
    if (originalOnFinish) {
      await originalOnFinish(...args);
    }

    const { marker, identity } = quickExit(opts.origin, {
      exitType: opts.exitType ?? ExitType.Voluntary,
    });

    if (opts.onMarkerCreated) {
      await opts.onMarkerCreated(marker, identity);
    }
  };
}

/**
 * Creates an `onStart` callback that verifies an EXIT marker and creates
 * an arrival marker when an AI SDK call begins (entry side).
 */
export function createEntryOnStart(exitMarkerJson: string, opts: EntryMiddlewareOpts) {
  return async (_event: Record<string, unknown>) => {
    const result: QuickEntryResult = quickEntry(exitMarkerJson, opts.destination);

    if (opts.onArrivalCreated) {
      await opts.onArrivalCreated(result.arrivalMarker, result.exitMarker);
    }

    return {
      arrivalMarker: opts.includeInMetadata !== false ? JSON.stringify(result.arrivalMarker) : undefined,
      continuity: result.continuity,
    };
  };
}

/**
 * Creates an `onFinish` callback that produces BOTH an EXIT marker
 * and optionally an arrival marker at a destination (full transit).
 */
export function createTransitOnFinish(opts: TransitMiddlewareOpts) {
  return async (event: { text: string; [key: string]: unknown }) => {
    const { marker, identity } = quickExit(opts.origin, {
      exitType: opts.exitType ?? ExitType.Voluntary,
    });

    if (opts.onMarkerCreated) {
      await opts.onMarkerCreated(marker, identity);
    }

    let arrivalResult: QuickEntryResult | undefined;
    if (opts.arrivalDestination) {
      arrivalResult = quickEntry(toJSON(marker), opts.arrivalDestination);
      if (opts.onArrivalCreated) {
        await opts.onArrivalCreated(arrivalResult.arrivalMarker, arrivalResult.exitMarker);
      }
    }

    return {
      exitMarker: opts.includeInMetadata !== false ? toJSON(marker) : undefined,
      exitMarkerId: marker.id,
      arrivalMarker: arrivalResult
        ? JSON.stringify(arrivalResult.arrivalMarker)
        : undefined,
      continuity: arrivalResult?.continuity,
    };
  };
}
