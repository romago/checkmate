import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import Sidebar from './Sidebar';
import NotesList from './NotesList';
import NoteEditor from './NoteEditor';

export default function Layout() {
  const { init, isLoading, createNote, selectedFolderId } = useStore();
  const [mobilePanel, setMobilePanel] = useState('notes');
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    // Reset to view mode whenever the active panel changes
    // (opening a different note or navigating away always starts in view mode)
    setIsEditMode(false);
  }, [mobilePanel]);

  useEffect(() => {
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCompose = async () => {
    await createNote(selectedFolderId);
    setIsEditMode(true);
    setMobilePanel('editor');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-notes-bg">
        <span className="text-notes-muted text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar panel */}
        <div className={`w-full md:w-auto flex-shrink-0 ${mobilePanel === 'folders' ? 'flex' : 'hidden'} md:flex`}>
          <Sidebar onFolderSelect={() => setMobilePanel('notes')} />
        </div>

        {/* Notes list panel */}
        <div className={`w-full md:w-auto flex-shrink-0 ${mobilePanel === 'notes' ? 'flex' : 'hidden'} md:flex`}>
          <NotesList
            onNoteSelect={() => setMobilePanel('editor')}
            onBack={() => setMobilePanel('folders')}
          />
        </div>

        {/* Editor panel */}
        <div className={`w-full md:flex-1 md:min-w-0 ${mobilePanel === 'editor' ? 'flex' : 'hidden'} md:flex`}>
          <NoteEditor onBack={() => setMobilePanel('notes')} isEditMode={isEditMode} />
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-notes-border flex items-center justify-around h-14 px-8">
        <button
          onClick={() => setMobilePanel('folders')}
          className={`flex flex-col items-center gap-0.5 transition-colors ${mobilePanel === 'folders' ? 'text-notes-text' : 'text-notes-muted'}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          <span className="text-[10px] font-medium">Folders</span>
        </button>

        <button
          onClick={handleCompose}
          className="w-11 h-11 bg-notes-yellow rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
          aria-label="New note"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {mobilePanel === 'editor' ? (
          /* Pencil button — toggles edit mode when viewing a note */
          <button
            onClick={() => setIsEditMode((v) => !v)}
            className={`flex flex-col items-center gap-0.5 transition-colors ${isEditMode ? 'text-notes-text' : 'text-notes-muted'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-[10px] font-medium">{isEditMode ? 'Editing' : 'Edit'}</span>
          </button>
        ) : (
          <button
            onClick={() => setMobilePanel('notes')}
            className={`flex flex-col items-center gap-0.5 transition-colors ${mobilePanel !== 'folders' ? 'text-notes-text' : 'text-notes-muted'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[10px] font-medium">Notes</span>
          </button>
        )}
      </nav>
    </>
  );
}

