import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildPostContent } from '../../lib/bridge/markdown/feishu.js';

describe('feishu markdown', () => {
  it('groups consecutive lines into markdown blocks and preserves blank lines', () => {
    const payload = JSON.parse(buildPostContent('第一段\n第二段\n\n第三段'));

    assert.deepEqual(payload, {
      zh_cn: {
        content: [
          [{ tag: 'md', text: '第一段\n第二段' }],
          [{ tag: 'text', text: ' ' }],
          [{ tag: 'md', text: '第三段' }],
        ],
      },
    });
  });

  it('keeps nested list lines inside the same markdown block', () => {
    const payload = JSON.parse(buildPostContent([
      '- 一级',
      '  - 二级一',
      '  - 二级二',
      '- 一级二',
    ].join('\n')));

    assert.deepEqual(payload, {
      zh_cn: {
        content: [
          [{ tag: 'md', text: '- 一级\n  - 二级一\n  - 二级二\n- 一级二' }],
        ],
      },
    });
  });

  it('keeps third-level nested list lines inside the same markdown block', () => {
    const payload = JSON.parse(buildPostContent([
      '- 一级',
      '  - 二级',
      '    - 三级一',
      '    - 三级二',
      '- 一级二',
    ].join('\n')));

    assert.deepEqual(payload, {
      zh_cn: {
        content: [
          [{ tag: 'md', text: '- 一级\n  - 二级\n    - 三级一\n    - 三级二\n- 一级二' }],
        ],
      },
    });
  });
});
