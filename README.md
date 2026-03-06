# @cellar-door/vercel-ai-sdk

> **⚠️ Pre-release software — no formal security audit has been conducted.** This project is published for transparency, review, and community feedback. It should not be used in production systems where security guarantees are required. If you find a vulnerability, please report it to hawthornhollows@gmail.com.


Vercel AI SDK integration for [`cellar-door-exit`](https://www.npmjs.com/package/cellar-door-exit) and [`cellar-door-entry`](https://www.npmjs.com/package/cellar-door-entry) — cryptographically signed, verifiable agent departure and arrival markers.

Part of the [EXIT Protocol](https://github.com/CellarDoorExits/exit-door).

## Install

```bash
npm install @cellar-door/vercel-ai-sdk cellar-door-exit cellar-door-entry ai
```

## EXIT Tools

### Tool — Let the Agent Create EXIT Markers

```ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { exitMarkerTool } from "@cellar-door/vercel-ai-sdk";

const { text, toolResults } = await generateText({
  model: openai("gpt-4o"),
  tools: { exitMarker: exitMarkerTool },
  prompt: "Complete the task and produce a departure marker.",
});
```

### Middleware — Automatic EXIT on Session End

```ts
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

## ENTRY Tools

### Tool — Verify and Admit an Agent

```ts
import { generateText } from "ai";
import { verifyAndAdmitAgentTool } from "@cellar-door/vercel-ai-sdk";

const { toolResults } = await generateText({
  model: openai("gpt-4o"),
  tools: { admitAgent: verifyAndAdmitAgentTool },
  prompt: "Verify this EXIT marker and create an arrival.",
});
// The agent calls admitAgent with { exitMarkerJson, destination, admissionPolicy? }
```

### Tool — Evaluate Admission Policy

```ts
import { evaluateAdmissionTool } from "@cellar-door/vercel-ai-sdk";

// Check if an EXIT marker meets a policy without creating an arrival
const { toolResults } = await generateText({
  model,
  tools: { checkAdmission: evaluateAdmissionTool },
  prompt: "Check if this departure meets STRICT policy.",
});
```

### Tool — Verify Transfer Chain

```ts
import { verifyTransferTool } from "@cellar-door/vercel-ai-sdk";

// Verify a complete EXIT→ENTRY transfer
const { toolResults } = await generateText({
  model,
  tools: { verifyTransfer: verifyTransferTool },
  prompt: "Verify this transfer between platforms.",
});
```

### Middleware — Full Transit (EXIT + ENTRY)

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

- **`verifyAndAdmitAgentTool`** — Verify EXIT marker + create arrival (with optional admission policy)
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
