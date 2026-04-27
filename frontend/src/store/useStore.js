import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

export const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      folders: [],
      notes: [],
      selectedFolderId: 'all',
      selectedNoteId: null,
      searchQuery: '',
      isLoading: false,

      // ── Auth ──────────────────────────────────────────────
      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('checkmate_token', data.token);
        set({ user: data.user, token: data.token });
        await get().fetchAll();
      },

      register: async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('checkmate_token', data.token);
        set({ user: data.user, token: data.token });
      },

      changePassword: async (currentPassword, newPassword) => {
        await api.put('/auth/password', { currentPassword, newPassword });
      },

      logout: () => {
        localStorage.removeItem('checkmate_token');
        set({ user: null, token: null, folders: [], notes: [], selectedNoteId: null });
      },

      // ── Data ──────────────────────────────────────────────
      fetchAll: async () => {
        set({ isLoading: true });
        try {
          const [foldersRes, notesRes] = await Promise.all([
            api.get('/folders'),
            api.get('/notes'),
          ]);
          set({ folders: foldersRes.data, notes: notesRes.data });
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Folders ───────────────────────────────────────────
      createFolder: async (name, color) => {
        const { data } = await api.post('/folders', { name, color });
        set((s) => ({ folders: [...s.folders, data] }));
        return data;
      },

      updateFolder: async (id, updates) => {
        const { data } = await api.put(`/folders/${id}`, updates);
        set((s) => ({ folders: s.folders.map((f) => (f._id === id ? data : f)) }));
      },

      deleteFolder: async (id) => {
        await api.delete(`/folders/${id}`);
        set((s) => ({
          folders: s.folders.filter((f) => f._id !== id),
          notes: s.notes.map((n) => (n.folderId === id ? { ...n, folderId: null } : n)),
          selectedFolderId: s.selectedFolderId === id ? 'all' : s.selectedFolderId,
        }));
      },

      // ── Notes ─────────────────────────────────────────────
      fetchNotes: async (folderId) => {
        const params = {};
        if (folderId && folderId !== 'all') params.folderId = folderId;
        const { data } = await api.get('/notes', { params });
        set({ notes: data });
      },

      createNote: async (folderId) => {
        const realFolderId = folderId === 'all' ? null : folderId;
        const { data } = await api.post('/notes', {
          title: 'New note',
          content: '',
          folderId: realFolderId,
        });
        set((s) => ({ notes: [data, ...s.notes], selectedNoteId: data._id }));
        return data;
      },

      updateNote: async (id, updates) => {
        const { data } = await api.put(`/notes/${id}`, updates);
        set((s) => ({ notes: s.notes.map((n) => (n._id === id ? { ...n, ...data } : n)) }));
        return data;
      },

      deleteNote: async (id) => {
        await api.delete(`/notes/${id}`);
        set((s) => {
          const notes = s.notes.filter((n) => n._id !== id);
          const selectedNoteId =
            s.selectedNoteId === id ? (notes[0]?._id ?? null) : s.selectedNoteId;
          return { notes, selectedNoteId };
        });
      },

      pinNote: async (id) => {
        const { data } = await api.patch(`/notes/${id}/pin`);
        set((s) => ({
          notes: s.notes.map((n) => (n._id === id ? { ...n, isPinned: data.isPinned } : n)),
        }));
      },

      // ── UI ────────────────────────────────────────────────
      setSelectedFolder: (id) => {
        set({ selectedFolderId: id, selectedNoteId: null });
        get().fetchNotes(id);
      },

      setSelectedNote: (id) => set({ selectedNoteId: id }),

      setSearchQuery: (q) => {
        set({ searchQuery: q });
        if (q) {
          api.get('/notes', { params: { search: q } }).then(({ data }) => set({ notes: data }));
        } else {
          get().fetchNotes(get().selectedFolderId);
        }
      },

      init: async () => {
        const token = localStorage.getItem('checkmate_token');
        if (!token) return;
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user, token });
          await get().fetchAll();
        } catch {
          localStorage.removeItem('checkmate_token');
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: 'checkmate-store',
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
);
