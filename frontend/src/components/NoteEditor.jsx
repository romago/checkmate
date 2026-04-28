import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { format } from 'date-fns';
import { TaskSorter } from '../extensions/taskSorter';
import { useStore } from '../store/useStore';

const SAVE_DELAY = 1500;

export default function NoteEditor({ onBack, isEditMode = true }) {
  const { notes, selectedNoteId, updateNote, folders } = useStore();
  const note = notes.find((n) => n._id === selectedNoteId);
  const saveTimer = useRef(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'pending' | 'saving'
  const editorWrapRef = useRef(null);

  // Reactive isMobileWidth — updates on DevTools resize and device orientation
  const [isMobileWidth, setIsMobileWidth] = useState(
    () => !window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e) => setIsMobileWidth(!e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // viewMode = mobile-width + note open for reading, not editing
  const viewMode = isMobileWidth && !isEditMode;

  const debouncedSave = useCallback(
    (id, content, title) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveStatus('pending');
      saveTimer.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await updateNote(id, { content, title });
          setSaveStatus('saved');
        } catch {
          setSaveStatus('pending');
        }
      }, SAVE_DELAY);
    },
    [updateNote]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Start typing...' }),
      TaskSorter,
    ],
    content: note?.content || '',
    onUpdate({ editor }) {
      if (!selectedNoteId) return;
      const html = editor.getHTML();
      const text = editor.getText();
      const firstLine = text.split('\n')[0]?.trim() || '';
      const title = firstLine.slice(0, 100) || 'New note';
      debouncedSave(selectedNoteId, html, title);
    },
    editorProps: {
      attributes: { class: 'focus:outline-none' },
    },
  });

  // Sync editor content when selected note changes
  useEffect(() => {
    if (!editor) return;
    if (!note) {
      editor.commands.setContent('', false);
      return;
    }
    editor.commands.setContent(note.content || '', false);
    setSaveStatus('saved');
  }, [selectedNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── View mode: block keyboard + allow checkbox toggles ─────────────────
  //
  // Strategy:
  //   1. editor.setEditable(false) → sets contenteditable="false" on .ProseMirror
  //      → tapping text never focuses the editor → keyboard never appears.
  //      Native <input type="checkbox"> elements are NOT affected by contenteditable
  //      and remain clickable.
  //
  //   2. TipTap's TaskItem NodeView has a `change` listener on the checkbox that
  //      does `if (!view.editable) { checkbox.checked = !checkbox.checked; return }`
  //      — it REVERTS the user's tap. We intercept in capture phase (which runs
  //      top-down, BEFORE the element's own listeners) and call stopPropagation()
  //      so TipTap's handler never fires.
  //
  //   3. We then dispatch our own setNodeMarkup transaction to toggle the state.
  //      Index-based node lookup (querySelectorAll + doc.descendants) is used
  //      because PM node identity and posAtDOM are unreliable.
  useEffect(() => {
    if (!editor) return;
    // Keep editor.editable in sync with viewMode
    editor.setEditable(!viewMode);

    if (!viewMode) return;

    const dom = editor.view.dom;

    // Helper: resolve the task item <li> from a target element.
    // TipTap does NOT always add data-type="taskItem" to <li> when editable=false,
    // so we match any <li> that is a direct child of ul[data-type="taskList"].
    const getTaskItemEl = (target) => {
      const li = target.closest('li');
      if (!li) return null;
      if (li.parentElement?.matches('ul[data-type="taskList"]')) return li;
      return null;
    };

    // Resolve PM node position from the task item's contentDOM (<div> inside <li>).
    // posAtDOM on the content div is reliable: it's in PM's DOM map even when editable=false.
    // We avoid counter-based indexing entirely — it breaks when PM state order ≠ DOM order.
    const getTaskItemPMNode = (taskItemEl) => {
      // TipTap TaskItem NodeView: <li> → <label><input></label> + <div contenteditable>
      const contentDiv = taskItemEl.querySelector(':scope > div');
      if (!contentDiv) {
        console.error('[toggle] no contentDiv in', taskItemEl.outerHTML.slice(0, 120));
        return null;
      }
      let pmPos;
      try {
        pmPos = editor.view.posAtDOM(contentDiv, 0);
      } catch (err) {
        console.error('[toggle] posAtDOM threw:', err.message);
        return null;
      }
      const $pos = editor.state.doc.resolve(pmPos);
      for (let d = $pos.depth; d >= 0; d--) {
        if ($pos.node(d).type.name === 'taskItem') {
          return { node: $pos.node(d), pos: $pos.before(d) };
        }
      }
      console.error('[toggle] taskItem not found at pmPos', pmPos);
      return null;
    };

    const toggleTaskItem = (taskItemEl, newChecked) => {
      const found = getTaskItemPMNode(taskItemEl);
      if (!found) return;
      console.log('[toggle] dispatching checked:', found.node.attrs.checked, '→', newChecked);
      editor.view.dispatch(
        editor.view.state.tr.setNodeMarkup(found.pos, null, { ...found.node.attrs, checked: newChecked })
      );
    };

    // `change` fires when the native checkbox is toggled. capture=true runs before
    // TipTap's own handler which would revert the change when editable=false.
    const onCheckboxChange = (e) => {
      const checkbox = e.target;
      if (checkbox.type !== 'checkbox') return;
      e.stopPropagation();
      const taskItemEl = getTaskItemEl(checkbox);
      if (!taskItemEl) return;
      toggleTaskItem(taskItemEl, checkbox.checked);
    };

    let touchStartX = 0;
    let touchStartY = 0;
    const onTextTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const onTextTouchEnd = (e) => {
      const t = e.changedTouches[0];
      if (Math.abs(t.clientX - touchStartX) > 10 || Math.abs(t.clientY - touchStartY) > 10) return;
      if (e.target.tagName === 'INPUT' || e.target.closest('label')) return;
      const taskItemEl = getTaskItemEl(e.target);
      if (!taskItemEl) return;
      const found = getTaskItemPMNode(taskItemEl);
      if (!found) return;
      console.log('[touchend text] curChecked:', found.node.attrs.checked, '→', !found.node.attrs.checked);
      toggleTaskItem(taskItemEl, !found.node.attrs.checked);
    };

    dom.addEventListener('change', onCheckboxChange, true);
    dom.addEventListener('touchstart', onTextTouchStart, { passive: true });
    dom.addEventListener('touchend', onTextTouchEnd);
    return () => {
      dom.removeEventListener('change', onCheckboxChange, true);
      dom.removeEventListener('touchstart', onTextTouchStart);
      dom.removeEventListener('touchend', onTextTouchEnd);
      editor.setEditable(true);
    };
  }, [editor, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!note) {
    return (
      <div className="flex-1 flex flex-col bg-notes-bg">
        <div className="md:hidden flex items-center px-4 pt-4 pb-2">
          <button onClick={onBack} className="flex items-center gap-1 text-notes-muted text-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Notes
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-notes-muted gap-2">
          <span className="text-5xl">✏️</span>
          <p className="text-sm font-medium">Select a note</p>
          <p className="text-xs">or create a new one</p>
        </div>
      </div>
    );
  }

  const folder = folders.find((f) => f._id === note.folderId);
  const wordCount = editor?.getText().trim().split(/\s+/).filter(Boolean).length ?? 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Toolbar — hidden on mobile in view mode */}
      <div className={`border-b border-notes-border items-stretch ${viewMode ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-0.5 px-2 py-2 overflow-x-auto no-scrollbar flex-1">
          {/* Mobile back button */}
          <button
            onClick={onBack}
            className="md:hidden flex items-center gap-0.5 text-notes-muted pr-2 mr-0.5 border-r border-notes-border flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <Btn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold">
            <strong>B</strong>
          </Btn>
        <Btn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic">
          <em>I</em>
        </Btn>
        <Btn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline">
          <span className="underline">U</span>
        </Btn>
        <Btn onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} title="Strikethrough">
          <span className="line-through">S</span>
        </Btn>
        <Btn onClick={() => editor?.chain().focus().toggleHighlight().run()} active={editor?.isActive('highlight')} title="Highlight">
          <span className="bg-yellow-200 px-0.5 rounded-sm text-xs">H</span>
        </Btn>

        <Divider />

        <Btn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="Heading 1">
          <span className="text-xs font-bold">H1</span>
        </Btn>
        <Btn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading 2">
          <span className="text-xs font-bold">H2</span>
        </Btn>
        <Btn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="Heading 3">
          <span className="text-xs font-bold">H3</span>
        </Btn>

        <Divider />

        <Btn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </Btn>
        <Btn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Ordered list">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10M7 16h10M3 8h.01M3 12h.01M3 16h.01" />
          </svg>
        </Btn>
        <Btn onClick={() => editor?.chain().focus().toggleTaskList().run()} active={editor?.isActive('taskList')} title="Checklist">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Btn>

        <Divider />

        <Btn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Quote">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </Btn>
        <Btn onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive('codeBlock')} title="Code block">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </Btn>

          <div className="flex-shrink-0 w-2" />
        </div>
        <div className="flex items-center px-2 flex-shrink-0 text-xs text-notes-muted border-l border-notes-border/50">
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'pending' ? '●' : ''}
        </div>
      </div>

      {/* Note meta */}
      <div className="px-4 md:px-8 pt-5 pb-3 border-b border-notes-border/30">
        <div className="flex items-center gap-2 text-[11px] text-notes-muted mb-1">
          {folder && (
            <>
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: folder.color }} />
              <span>{folder.name}</span>
              <span>·</span>
            </>
          )}
          <span>{format(new Date(note.updatedAt), 'MMM d, yyyy · HH:mm')}</span>
          <span>·</span>
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        </div>
        <h1 className="text-xl font-semibold text-notes-text">{note.title}</h1>
      </div>

      {/* Editor content */}
      <div
        ref={editorWrapRef}
        className={`flex-1 overflow-y-auto px-4 md:px-8 py-5 pb-20 md:pb-5 ${viewMode ? 'cursor-default' : 'cursor-text'}`}
        onClick={() => { if (!viewMode) editor?.commands.focus(); }}
      >
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  );
}

function Btn({ onClick, active, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors ${
        active
          ? 'bg-notes-yellow/40 text-notes-text'
          : 'text-notes-muted hover:bg-notes-bg hover:text-notes-text'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-notes-border mx-1 flex-shrink-0" />;
}
