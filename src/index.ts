// EXIT tools
export { exitMarkerTool, type ExitMarkerToolResult } from "./exit-tool.js";
export {
  createExitOnFinish,
  withExitMarker,
  createEntryOnStart,
  createTransitOnFinish,
  type ExitMiddlewareOpts,
  type EntryMiddlewareOpts,
  type TransitMiddlewareOpts,
} from "./exit-middleware.js";

// ENTRY factory tools
export {
  createEntryTool,
  createPassageTool,
  type EntryToolOpts,
  type EntryToolResult,
  type PassageToolOpts,
  type PassageToolResult,
} from "./entry-tool.js";

// Verify & Counter-sign tools
export { verifyExitMarkerTool, type VerifyToolResult } from "./verify-tool.js";
export { counterSignExitMarkerTool, type CountersignToolResult } from "./countersign-tool.js";

// ENTRY tools
export {
  verifyAndAdmitAgentTool,
  evaluateAdmissionTool,
  verifyTransferTool,
  type VerifyAndAdmitResult,
  type EvaluateAdmissionResult,
  type VerifyTransferResult,
} from "./entry-tools.js";
