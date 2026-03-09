import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildPostContent } from '../../lib/bridge/markdown/feishu.js';

describe('feishu markdown', () => {
  it('splits post content into separate paragraphs and preserves blank lines', () => {
    const payload = JSON.parse(buildPostContent('第一段\n第二段\n\n第三段'));

    assert.deepEqual(payload, {
      zh_cn: {
        content: [
          [{ tag: 'md', text: '第一段' }],
          [{ tag: 'md', text: '第二段' }],
          [{ tag: 'text', text: ' ' }],
          [{ tag: 'md', text: '第三段' }],
        ],
      },
    });
  });
});
