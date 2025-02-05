//
// Copyright 2023 DXOS.org
//

import { StreamLanguage, HighlightStyle } from '@codemirror/language';

import { tags } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

/**
 * Simple Monaco language extension.
 * https://github.com/codemirror/stream-parser/blob/main/test/test-stream-parser.ts
 */
export const promptLanguage = StreamLanguage.define<{ count: number }>({
  startState: () => ({ count: 0 }),

  token: (stream, state) => {
    state.count++;
    if (stream.eatSpace()) {
      return null;
    }
    if (state.count === 1 && stream.match(/^(\/\w+)/)) {
      return 'tagName';
    }
    stream.next();
    return null;
  },
});

/**
 * https://codemirror.net/examples/styling
 * https://lezer.codemirror.net/docs/ref/#highlight
 */
export const promptHighlightStyles = HighlightStyle.define([
  {
    tag: tags.tagName,
    class: mx(
      'mr-1 p-1',
      'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white font-mono text-sm',
      'rounded border border-neutral-300 dark:border-neutral-700',
    ),
  },
]);
