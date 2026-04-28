import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

/**
 * When a task item is checked it automatically moves to the bottom
 * of its task list (first among checked items). Checked items never
 * get a strikethrough or dimmed text — that is handled in CSS.
 */
export const TaskSorter = Extension.create({
  name: 'taskSorter',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          if (transactions.some((tr) => tr.getMeta('taskSort'))) return null;

          const replacements = [];

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'taskList') return;

            const items = [];
            node.forEach((child) => items.push(child));

            let seenChecked = false;
            let needsSort = false;
            for (const item of items) {
              if (item.attrs.checked) seenChecked = true;
              else if (seenChecked) { needsSort = true; break; }
            }

            if (needsSort) {
              const unchecked = items.filter((i) => !i.attrs.checked);
              const checked = items.filter((i) => i.attrs.checked);
              const newList = node.type.create(node.attrs, [...unchecked, ...checked]);
              replacements.push({ from: pos, to: pos + node.nodeSize, node: newList });
            }
          });

          if (replacements.length === 0) return null;

          const tr = newState.tr;
          [...replacements].reverse().forEach(({ from, to, node }) => {
            tr.replaceWith(from, to, node);
          });
          tr.setMeta('taskSort', true);
          return tr;
        },
      }),
    ];
  },
});
