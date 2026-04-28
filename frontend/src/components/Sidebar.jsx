import { useState } from 'react';
import { useStore } from '../store/useStore';
import SettingsModal from './SettingsModal';

const COLORS = [
  '#FFD60A', '#FF9F0A', '#FF453A', '#FF6961',
  '#30D158', '#0A84FF', '#5E5CE6', '#BF5AF2',
];

export default function Sidebar({ onFolderSelect }) {
  const {
    folders,
    selectedFolderId,
    notes,
    setSelectedFolder,
    createFolder,
    deleteFolder,
    updateFolder,
    logout,
    user,
  } = useStore();

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const getCount = (folderId) => {
    if (folderId === 'all') return notes.length;
    return notes.filter((n) => n.folderId === folderId).length;
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim(), COLORS[0]);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleRename = async (id) => {
    if (editingName.trim()) await updateFolder(id, { name: editingName.trim() });
    setEditingId(null);
  };

  return (
    <div className="w-full md:w-56 flex-shrink-0 bg-notes-sidebar border-r border-notes-border flex flex-col h-full select-none">
      {/* User header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-notes-yellow flex items-center justify-center text-xs font-bold flex-shrink-0">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <span className="text-sm font-medium text-notes-text truncate flex-1">{user?.name}</span>
        <button
          onClick={() => setShowSettings(true)}
          title="Settings"
          className="text-notes-muted hover:text-notes-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button
          onClick={logout}
          title="Sign out"
          className="text-notes-muted hover:text-red-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-20 md:pb-4 space-y-0.5">
        {/* All Notes */}
        <NavItem
          emoji="📋"
          label="All Notes"
          count={getCount('all')}
          active={selectedFolderId === 'all'}
          onClick={() => { setSelectedFolder('all'); onFolderSelect?.(); }}
        />

        <div className="my-2 border-t border-notes-border/60" />

        {/* Folders section */}
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-[11px] font-semibold text-notes-muted uppercase tracking-wider">
            Folders
          </span>
          <button
            onClick={() => setShowNewFolder(true)}
            title="New folder"
            className="text-notes-muted hover:text-notes-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {showNewFolder && (
          <form onSubmit={handleCreateFolder} className="px-1 mb-1">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={() => { if (!newFolderName.trim()) setShowNewFolder(false); }}
              placeholder="Folder name"
              className="w-full text-sm px-2 py-1 rounded-lg border border-notes-yellow bg-white focus:outline-none"
            />
          </form>
        )}

        {folders.map((folder) => (
          <div key={folder._id} className="group relative">
            {editingId === folder._id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleRename(folder._id)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(folder._id)}
                className="w-full text-sm px-2 py-1 rounded-lg border border-notes-yellow bg-white focus:outline-none"
              />
            ) : (
              <NavItem
                color={folder.color}
                label={folder.name}
                count={getCount(folder._id)}
                active={selectedFolderId === folder._id}
                onClick={() => { setSelectedFolder(folder._id); onFolderSelect?.(); }}
                onDoubleClick={() => { setEditingId(folder._id); setEditingName(folder.name); }}
                action={
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFolder(folder._id); }}
                    className="opacity-0 group-hover:opacity-100 text-notes-muted hover:text-red-500 transition-all ml-1"
                    title="Delete folder"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                }
              />
            )}
          </div>
        ))}
      </nav>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function NavItem({ emoji, color, label, count, active, onClick, onDoubleClick, action }) {
  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left ${
        active ? 'bg-notes-yellow/30 text-notes-text font-medium' : 'text-notes-text hover:bg-black/5'
      }`}
    >
      {emoji ? (
        <span className="text-base w-5 text-center flex-shrink-0">{emoji}</span>
      ) : (
        <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: color || '#FFD60A' }} />
      )}
      <span className="flex-1 truncate">{label}</span>
      {count > 0 && <span className="text-xs text-notes-muted">{count}</span>}
      {action}
    </button>
  );
}
