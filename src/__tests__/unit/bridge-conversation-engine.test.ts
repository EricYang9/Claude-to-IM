import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { initBridgeContext } from '../../lib/bridge/context.js';
import { processMessage } from '../../lib/bridge/conversation-engine.js';
import type { BridgeStore, LLMProvider } from '../../lib/bridge/host.js';

function createMockStore() {
  const messages: Array<{ role: string; content: string; usage?: string | null }> = [];
  return {
    messages,
    getSetting: () => null,
    getChannelBinding: () => null,
    upsertChannelBinding: () => ({} as any),
    updateChannelBinding: () => {},
    listChannelBindings: () => [],
    getSession: () => ({ id: 'session-1', working_directory: '/tmp', model: '' }),
    createSession: () => ({ id: 'session-1', working_directory: '/tmp', model: '' }),
    updateSessionProviderId: () => {},
    addMessage: (_sessionId: string, role: string, content: string, usage?: string | null) => {
      messages.push({ role, content, usage });
    },
    getMessages: () => ({ messages: [] }),
    acquireSessionLock: () => true,
    renewSessionLock: () => {},
    releaseSessionLock: () => {},
    setSessionRuntimeStatus: () => {},
    updateSdkSessionId: () => {},
    updateSessionModel: () => {},
    syncSdkTasks: () => {},
    getProvider: () => undefined,
    getDefaultProviderId: () => null,
    insertAuditLog: () => {},
    checkDedup: () => false,
    insertDedup: () => {},
    cleanupExpiredDedup: () => {},
    insertOutboundRef: () => {},
    insertPermissionLink: () => {},
    getPermissionLink: () => null,
    markPermissionLinkResolved: () => false,
    getChannelOffset: () => '0',
    setChannelOffset: () => {},
  };
}

function sse(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, data: typeof data === 'string' ? data : JSON.stringify(data) })}\n`;
}

describe('conversation-engine', () => {
  it('joins text blocks with paragraph breaks across tool events', async () => {
    const store = createMockStore();
    const llm: LLMProvider = {
      streamChat: () => new ReadableStream<string>({
        start(controller) {
          controller.enqueue(sse('text', '第一段'));
          controller.enqueue(sse('tool_use', { id: 'tool-1', name: 'Bash', input: { command: 'echo hi' } }));
          controller.enqueue(sse('tool_result', { tool_use_id: 'tool-1', content: 'hi' }));
          controller.enqueue(sse('text', '第二段'));
          controller.enqueue(sse('result', { usage: { input_tokens: 1, output_tokens: 1 } }));
          controller.close();
        },
      }),
    };

    delete (globalThis as Record<string, unknown>)['__bridge_context__'];
    initBridgeContext({
      store: store as unknown as BridgeStore,
      llm,
      permissions: { resolvePendingPermission: () => false },
      lifecycle: {},
    });

    const result = await processMessage(
      {
        channelType: 'feishu',
        chatId: 'chat-1',
        codepilotSessionId: 'session-1',
        workingDirectory: '/tmp',
        model: '',
      } as any,
      '继续',
    );

    assert.equal(result.responseText, '第一段\n\n第二段');
    const assistant = store.messages.find((item) => item.role === 'assistant');
    assert.ok(assistant);
    assert.equal(assistant?.content, '第一段\n\n第二段');
  });
});
