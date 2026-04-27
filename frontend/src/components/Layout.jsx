import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import Sidebar from './Sidebar';
import NotesList from './NotesList';
import NoteEditor from './NoteEditor';

export default function Layout() {
  const { init, isLoading } = useStore();

  useEffect(() => {
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-notes-bg">
        <span className="text-notes-muted text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <NotesList />
      <NoteEditor />
    </div>
  );
}
