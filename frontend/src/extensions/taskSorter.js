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
          // Skip if nothing changed or if this is already our own sort transaction
          if (!transactions.some((tr) => tr.docChanged)) return null;
          if (transactions.some((tr) => tr.getMeta('taskSort'))) return null;

          const replacements = [];

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'taskList') return;

            const items = [];
            node.forEach((child) => items.push(child));

            // Detect if any checked item comes before an unchecked one
            let seenChecked = false;
            let needsSort = false;
            for (const item of items) {
              if (item.attrs.checked) {
                seenChecked = true;
              } else if (seenChecked) {
                needsSort = true;
                break;
              }
            }

            if (needsSort) {
              const unchecked = items.filter((i) => !i.attrs.checked);
              const checked = items.filter((i) => i.attrs.checked);
              const sorted = [...unchecked, ...checked];
              const newList = node.type.create(node.attrs, sorted);
              replacements.push({ from: pos, to: pos + node.nodeSize, node: newList });
            }
          });

          if (replacements.length === 0) return null;

          // Apply in reverse order to keep positions valid
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
