# @cellar-door/vercel-ai-sdk

[![npm version](https://img.shields.io/npm/v/@cellar-door/vercel-ai-sdk)](https://www.npmjs.com/package/@cellar-door/vercel-ai-sdk)
[![tests](https://img.shields.io/badge/tests-18_passing-brightgreen)]()
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)
[![NIST](https://img.shields.io/badge/NIST-submitted-orange)](https://cellar-door.dev/nist/)

> **⚠️ Pre-release software — no formal security audit has been conducted.** This project is published for transparency, review, and community feedback. It should not be used in production systems where security guarantees are required. If you find a vulnerability, please report it to hawthornhollows@gmail.com.

Add verifiable departure and arrival records to your Vercel AI SDK agents.

## Ecosystem

| Package | Language | Description |
|---------|----------|-------------|
| [cellar-door-exit](https://github.com/CellarDoorExits/exit-door) | TypeScript | Core protocol (reference impl) |
| [cellar-door-exit](https://github.com/CellarDoorExits/exit-python) | Python | Core protocol |
| [cellar-door-entry](https://github.com/CellarDoorExits/entry-door) | TypeScript | Arrival/entry markers |
| [@cellar-door/langchain](https://github.com/CellarDoorExits/langchain) | TypeScript | LangChain integration |
| [cellar-door-langchain](https://github.com/CellarDoorExits/cellar-door-langchain-python) | Python | LangChain integration |
| **[@cellar-door/vercel-ai-sdk](https://github.com/CellarDoorExits/vercel-ai-sdk)** | **TypeScript** | **Vercel AI SDK ← you are here** |
| [@cellar-door/mcp-server](https://github.com/CellarDoorExits/mcp-server) | TypeScript | MCP server |
| [@cellar-door/eliza](https://github.com/CellarDoorExits/eliza-exit) | TypeScript | ElizaOS plugin |
| [@cellar-door/eas](https://github.com/CellarDoorExits/eas-adapter) | TypeScript | EAS attestation anchoring |
| [@cellar-door/erc-8004](https://github.com/CellarDoorExits/erc-8004-adapter) | TypeScript | ERC-8004 identity/reputation |
| [@cellar-door/sign-protocol](https://github.com/CellarDoorExits/sign-protocol-adapter) | TypeScript | Sign Protocol attestation |

**[Paper](https://cellar-door.dev/paper/) · [Website](https://cellar-door.dev)**

## Quick Start

```bash
npm install @cellar-door/vercel-ai-sdk cellar-door-exit cellar-door-entry ai
```

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { exitMarkerTool } from "@cellar-door/vercel-ai-sdk";

const { text, toolResults } = await generateText({
  model: openai("gpt-4o"),
  tools: { exitMarker: exitMarkerTool },
  prompt: "Complete the task and produce a departure marker for did:web:platform.example",
});

// The agent creates a signed EXIT marker automatically
// toolResults contains the verified marker JSON
```

### Automatic EXIT on session end

```typescript
import { streamText } from "ai";
import { createExitOnFinish } from "@cellar-door/vercel-ai-sdk";

const result = await streamText({
  model: openai("gpt-4o"),
  prompt: "Hello!",
  onFinish: createExitOnFinish({
    origin: "my-agent",
    onMarkerCreated: (marker, identity) => {
      console.log("EXIT marker created:", marker.id);
    },
  }),
});
```

## EXIT Tools

### Tool

```ts
import { exitMarkerTool } from "@cellar-door/vercel-ai-sdk";
// Drop into any generateText/streamText call
```

### Middleware

```ts
import { createExitOnFinish } from "@cellar-door/vercel-ai-sdk";
// Automatic EXIT marker on session end
```

## ENTRY Tools

### Verify and Admit

```ts
import { verifyAndAdmitAgentTool } from "@cellar-door/vercel-ai-sdk";
// Agent calls with { exitMarkerJson, destination, admissionPolicy? }
```

### Evaluate Admission Policy

```ts
import { evaluateAdmissionTool } from "@cellar-door/vercel-ai-sdk";
// Check if an EXIT marker meets a policy without creating an arrival
```

### Verify Transfer Chain

```ts
import { verifyTransferTool } from "@cellar-door/vercel-ai-sdk";
// Verify a complete EXIT→ENTRY transfer
```

### Full Transit Middleware (EXIT + ENTRY)

```ts
import { createTransitOnFinish } from "@cellar-door/vercel-ai-sdk";

const result = await streamText({
  model,
  prompt: "Hello",
  onFinish: createTransitOnFinish({
    origin: "platform-a",
    arrivalDestination: "platform-b",
    onMarkerCreated: (marker) => console.log("EXIT:", marker.id),
    onArrivalCreated: (arrival) => console.log("ARRIVAL:", arrival.id),
  }),
});
```

## API

### EXIT

- **`exitMarkerTool`** — Vercel AI SDK tool for creating EXIT markers
- **`createExitOnFinish(opts)`** — `onFinish` callback for automatic EXIT markers
- **`withExitMarker(originalOnFinish, opts)`** — Wraps existing `onFinish` to also create EXIT markers

### ENTRY

- **`verifyAndAdmitAgentTool`** — Verify EXIT marker + create arrival
- **`evaluateAdmissionTool`** — Check if EXIT marker meets an admission policy
- **`verifyTransferTool`** — Verify a complete EXIT→ENTRY transfer chain
- **`createEntryOnStart(exitMarkerJson, opts)`** — Create arrival on session start
- **`createTransitOnFinish(opts)`** — Create both EXIT and ENTRY markers on finish

### Admission Policies

- `OPEN_DOOR` — Accept any verified departure
- `STRICT` — Voluntary only, <24h old, requires lineage + stateSnapshot
- `EMERGENCY_ONLY` — Accept only emergency exits

## ⚠️ Disclaimer

> **WARNING:** Automated admission decisions should be reviewed by platform operators. This integration does not constitute legal advice. Platforms are responsible for their own admission policies and the consequences of admitting agents.

## License

Apache-2.0
