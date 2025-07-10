import { create } from "zustand";

interface WorkspaceStore {
  workspaceslug: string | null;
  setworkspaceslug: (slug: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspaceslug: null,
  setworkspaceslug: (slug: string) => set({ workspaceslug: slug }),
}));
