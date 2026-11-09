> AI agents: this is one page from PostHog's docs. Full index of Markdown docs for LLMs: https://posthog.com/llms.txt

# Privacy mode

Canonical URL: https://posthog.com/docs/ai-observability/privacy-mode

> **Cloud region:** This page uses US Cloud hosts. For an EU Cloud project, use `https://eu.i.posthog.com` instead of `https://us.i.posthog.com` (ingestion host).

## On this page

- [SDK config](#sdk-config)
- [Request parameter](#request-parameter)
- [OpenTelemetry](#opentelemetry)
- [What privacy mode removes](#what-privacy-mode-removes)
- [What is still sent](#what-is-still-sent)

To avoid storing potentially sensitive prompt, reasoning, and completion data, you can enable privacy mode. This excludes the `$ai_input` and `$ai_output_choices` properties from being captured, along with any other content that can carry them.

**Data retention**

PostHog removes these and other large `$ai_` properties after 30 days. See [data retention](https://posthog.com/docs/ai-observability/data-retention.md) for details.

## SDK config

This can be done by setting the `privacy_mode` config option in the SDK like this:

### Python

```python
from posthog import Posthog

posthog = Posthog(
    "<ph_project_token>",
    host="https://us.i.posthog.com",
    privacy_mode=True
)
```

### TypeScript

```typescript
const phClient = new PostHog(
  '<ph_project_token>',
  {
    host: 'https://us.i.posthog.com',
    privacyMode: true
  }
)
```

The client setting applies to every AI integration that uses the client. A request-level setting can turn privacy mode on for a single request, but it can't turn it off when the client has it on.

## Request parameter

It can also be set at the request level by setting the `privacy_mode` parameter to `True` in the request. The exact setup depends on the LLM platform you're using:

### OpenAI.py

```python
client.responses.create(
    model="gpt-4o-mini",
    input=[...],
    posthog_privacy_mode=True
)
```

### OpenAI.ts

```typescript
const completion = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [...],
    posthogPrivacyMode: true
});
```

### Anthropic

```python
response = client.messages.create(
    model="claude-3-opus-20240229",
    messages=[...],
    posthog_privacy_mode=True
)
```

### Google

```python
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[...],
    posthog_privacy_mode=True
)
```

### LangChain

```python
callback_handler = PosthogCallbackHandler(
    client,
    privacy_mode=True
)
```

## OpenTelemetry

The PostHog span processor follows the privacy mode of the client you pass to it. You can also turn privacy mode on for the span processor or the trace exporter directly:

### Python

```python
from posthog.ai.otel import PostHogSpanProcessor

processor = PostHogSpanProcessor(
    # ...your existing options
    privacy_mode=True,
)
```

### TypeScript

```typescript
import { PostHogSpanProcessor } from '@posthog/ai/otel'

const processor = new PostHogSpanProcessor({
  // ...your existing options
  privacyMode: true,
})
```

In privacy mode, spans are sent without attributes that hold prompts, completions, tool arguments and results, retrieved documents, or error messages. Span events other than exceptions are also removed.

## What privacy mode removes

With privacy mode on, PostHog SDKs don't send:

-   Prompts, system prompts, and instructions (`$ai_input`, `$ai_instructions`)
-   Model outputs (`$ai_output_choices`), including partial output from a failed stream
-   Span and trace inputs and outputs (`$ai_input_state`, `$ai_output_state`)
-   Embedding inputs
-   Error messages and stack traces. `$ai_error` only holds the error class, HTTP status, provider error code, the name of the request parameter that caused the error, the request ID, and the classes of any underlying errors. For example: `BadRequestError: 400 invalid_request_error param=messages[3].content`.
-   Exceptions from AI calls to [Error Tracking](https://posthog.com/docs/error-tracking.md). The SDK still raises the error, so your own error handling sees it.

## What is still sent

Privacy mode doesn't remove metadata that describes the call:

-   Model, provider, token counts, costs, latency, and HTTP status
-   Model parameters such as `temperature` and `max_tokens`
-   Tool definitions (`$ai_tools`). These are the names, descriptions, and parameter schemas you pass to the model, not the tool calls the model makes.
-   Span names, trace names, and any custom properties you add

Remote MCP tool `headers` and `authorization` values are always replaced with `[REDACTED]`, whether or not privacy mode is on.

Make sure your custom properties, span names, and tool descriptions don't include sensitive data.
