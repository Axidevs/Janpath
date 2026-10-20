/**
 * server/src/tinyfish/agentClient.js
 *
 * Official TinyFish Agent Client implementing run-sse streaming
 * with polling fallback and event persistence.
 *
 * TINYFISH OFFICIAL SPECIFICATION COMPLIANCE:
 * - Endpoint: POST https://agent.tinyfish.ai/v1/automation/run-sse
 * - Header: X-API-Key
 * - Payload: url, goal, output_schema, browser_profile, proxy_config{country_code: 'IN'},
 *            agent_config{max_duration_seconds: 120}.
 * - Never send max_steps or mode (beta-gated).
 * - Events: STARTED, STREAMING_URL, PROGRESS, HEARTBEAT, COMPLETE.
 * - Disconnect recovery: Poll GET https://agent.tinyfish.ai/v1/runs/{run_id}.
 */

import { tinyfishOutputSchema } from './outputSchema.js';

const DEFAULT_BASE_URL = 'https://agent.tinyfish.ai';

export function createAgentClient(options = {}) {
  const apiKey = options.apiKey || '';
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const fetchFn = options.fetchFn || globalThis.fetch;
  const pollingIntervalMs = options.pollingIntervalMs || 2000;
  const maxPollingAttempts = options.maxPollingAttempts || 30;

  return {
    /**
     * Executes an agent run with SSE streaming and polling fallback.
     *
     * @param {Object} params
     * @param {string} params.url - Start URL
     * @param {string} params.goal - Exploration goal
     * @param {Object} [params.outputSchema] - Custom or default output schema
     * @param {Function} [params.onEvent] - (event: Object) => Promise<void>|void
     * @param {AbortSignal} [params.signal] - Abort controller signal
     * @returns {Promise<{ runId: string, result: Object, events: Object[] }>}
     */
    async run({ url, goal, outputSchema, onEvent, signal }) {
      const payload = {
        url,
        goal,
        output_schema: outputSchema || tinyfishOutputSchema,
        browser_profile: {},
        proxy_config: { country_code: 'IN' },
        agent_config: { max_duration_seconds: 120 }
      };

      const recordedEvents = [];
      let runId = null;

      const handleEvent = async (event) => {
        recordedEvents.push(event);
        if (event.run_id && !runId) {
          runId = event.run_id;
        }
        if (typeof onEvent === 'function') {
          try {
            await onEvent(event);
          } catch (err) {
            console.error('[AgentClient] onEvent callback error:', err.message);
          }
        }
      };

      let finalResult = null;
      let streamCompleted = false;

      try {
        const response = await fetchFn(`${baseUrl}/v1/automation/run-sse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            Accept: 'text/event-stream'
          },
          body: JSON.stringify(payload),
          signal
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(
            `TinyFish Agent SSE request failed with status ${response.status}: ${errText}`
          );
        }

        // Handle SSE stream (Node.js ReadableStream or web stream)
        const reader = response.body?.getReader
          ? response.body.getReader()
          : null;

        if (reader) {
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete trailing line

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data:')) {
                const jsonStr = trimmed.slice(5).trim();
                if (jsonStr) {
                  try {
                    const event = JSON.parse(jsonStr);
                    await handleEvent(event);

                    if (event.type === 'COMPLETE') {
                      streamCompleted = true;
                      finalResult = event.result || event.payload?.result || null;
                    }
                  } catch {
                    // Ignore malformed ping/sse lines
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        // If abort was requested, rethrow
        if (signal?.aborted) throw err;
        console.warn(
          '[AgentClient] SSE stream interrupted, attempting polling recovery...',
          err.message
        );
      }

      // If stream completed successfully with result, return immediately
      if (streamCompleted && finalResult) {
        return { runId: runId || 'unknown', result: finalResult, events: recordedEvents };
      }

      // If SSE disconnected before COMPLETE, poll GET /v1/runs/{run_id}
      if (runId) {
        return await this.pollRun(runId, { onEvent: handleEvent, recordedEvents, signal });
      }

      throw new Error(
        'TinyFish Agent run ended without a valid result or recoverable run_id'
      );
    },

    /**
     * Recovers an interrupted run by polling GET /v1/runs/{id}
     */
    async pollRun(runId, { onEvent, recordedEvents = [], signal } = {}) {
      for (let attempt = 1; attempt <= maxPollingAttempts; attempt++) {
        if (signal?.aborted) {
          throw new Error('TinyFish polling aborted by client');
        }

        const pollRes = await fetchFn(`${baseUrl}/v1/runs/${runId}`, {
          method: 'GET',
          headers: {
            'X-API-Key': apiKey,
            Accept: 'application/json'
          },
          signal
        });

        if (pollRes.ok) {
          const runData = await pollRes.json();
          const status = runData.status;

          if (typeof onEvent === 'function') {
            await onEvent({
              type: 'PROGRESS',
              run_id: runId,
              payload: { attempt, status }
            });
          }

          if (status === 'COMPLETED' || status === 'SUCCESS') {
            const result = runData.result || runData.output || null;
            if (typeof onEvent === 'function') {
              await onEvent({
                type: 'COMPLETE',
                run_id: runId,
                payload: { result }
              });
            }
            return { runId, result, events: recordedEvents };
          }

          if (status === 'FAILED' || status === 'ERROR') {
            throw new Error(`TinyFish Agent run failed: ${runData.error || 'Unknown error'}`);
          }
        }

        // Wait before next poll attempt
        await new Promise((r) => setTimeout(r, pollingIntervalMs));
      }

      throw new Error(
        `TinyFish polling timed out after ${maxPollingAttempts} attempts for run: ${runId}`
      );
    },

    /**
     * Cancels an ongoing agent run
     */
    async cancel(runId) {
      if (!runId) return;
      try {
        await fetchFn(`${baseUrl}/v1/runs/${runId}/cancel`, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey
          }
        });
      } catch (err) {
        console.warn(`[AgentClient] Failed to cancel run ${runId}:`, err.message);
      }
    }
  };
}
