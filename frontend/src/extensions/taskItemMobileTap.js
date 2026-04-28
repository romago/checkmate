import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

/**
 * Mobile-only: single tap on task item text does nothing (no keyboard).
 * Double tap on task item text enables editing (keyboard appears).
 * Tapping the checkbox or its label always toggles checked state normally.
 */
export const TaskItemMobileTap = Extension.create({
  name: 'taskItemMobileTap',

  addProseMirrorPlugins() {
    let lastTap = 0;
    let lastTaskItem = null;

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            touchstart(_view, event) {
              const target = event.target;
              const taskItem = target.closest('li[data-type="taskItem"]');
              if (!taskItem) return false;

              // Checkbox input or its label — always let through
              if (target.tagName === 'INPUT' || target.closest('label')) return false;

              const now = Date.now();
              const isDoubleTap = now - lastTap < 300 && lastTaskItem === taskItem;
              lastTap = now;
              lastTaskItem = taskItem;

              if (isDoubleTap) {
                // Reset so triple-tap doesn't count as another double-tap
                lastTap = 0;
                return false; // allow focus + keyboard
              }

              // Single tap on text — block keyboard
              event.preventDefault();
              return true;
            },
          },
        },
      }),
    ];
  },
});
