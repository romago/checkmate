import { useStore } from '../store/useStore';
import { formatDistanceToNow } from 'date-fns';


export default function NotesList() {
  const {
    notes,
    selectedNoteId,
    selectedFolderId,
    searchQuery,
    folders,
    setSelectedNote,
    createNote,
    deleteNote,
    pinNote,
    setSearchQuery,
  } = useStore();

  const folder = folders.find((f) => f._id === selectedFolderId);
  const title = selectedFolderId === 'all' ? 'All Notes' : (folder?.name ?? 'Notes');

  const pinned = notes.filter((n) => n.isPinned);
  const unpinned = notes.filter((n) => !n.isPinned);

  const extractPreview = (content) => {
    if (!content) return 'No content';
    const div = document.createElement('div');
    div.innerHTML = content;
    const text = (div.textContent || div.innerText || '').trim();
    return text.slice(0, 80) || 'No content';
  };

  return (
    <div className="w-72 flex-shrink-0 border-r border-notes-border flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-notes-text truncate">{title}</h2>
          <button
            onClick={() => createNote(selectedFolderId)}
            title="New note"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-notes-yellow hover:bg-yellow-400 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-notes-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-notes-bg rounded-lg focus:outline-none focus:ring-1 focus:ring-notes-yellow/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-notes-muted text-sm gap-2 pb-16">
            <span className="text-3xl">📝</span>
            <span>No notes</span>
            <button
              onClick={() => createNote(selectedFolderId)}
              className="text-notes-text underline text-xs mt-1"
            >
              Create the first one
            </button>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <>
                <SectionLabel>Pinned</SectionLabel>
                {pinned.map((note) => (
                  <NoteItem
                    key={note._id}
                    note={note}
                    active={note._id === selectedNoteId}
                    preview={extractPreview(note.content)}
                    onClick={() => setSelectedNote(note._id)}
                    onPin={() => pinNote(note._id)}
                    onDelete={() => deleteNote(note._id)}
                  />
                ))}
                {unpinned.length > 0 && <SectionLabel>Notes</SectionLabel>}
              </>
            )}
            {unpinned.map((note) => (
              <NoteItem
                key={note._id}
                note={note}
                active={note._id === selectedNoteId}
                preview={extractPreview(note.content)}
                onClick={() => setSelectedNote(note._id)}
                onPin={() => pinNote(note._id)}
                onDelete={() => deleteNote(note._id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="px-4 py-1 text-[11px] font-semibold text-notes-muted uppercase tracking-wider">
      {children}
    </div>
  );
}

function NoteItem({ note, active, preview, onClick, onPin, onDelete }) {
  const timeAgo = formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true });

  return (
    <div
      onClick={onClick}
      className={`group px-4 py-3 cursor-pointer border-b border-notes-border/40 relative ${
        active ? 'bg-notes-yellow/20' : 'hover:bg-notes-bg'
      }`}
    >
      <div className="font-medium text-sm text-notes-text truncate pr-14">{note.title}</div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-[11px] text-notes-muted whitespace-nowrap">{timeAgo}</span>
        <span className="text-[11px] text-notes-muted">·</span>
        <span className="text-[11px] text-notes-muted truncate">{preview}</span>
      </div>

      {/* Actions (visible on hover) */}
      <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); onPin(); }}
          title={note.isPinned ? 'Unpin' : 'Pin'}
          className="w-6 h-6 flex items-center justify-center rounded text-[12px] hover:bg-notes-border"
        >
          📌
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete"
          className="w-6 h-6 flex items-center justify-center rounded text-notes-muted hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {note.isPinned && !active && (
        <span className="absolute top-2.5 right-2 text-[11px] group-hover:hidden">📌</span>
      )}
    </div>
  );
}
