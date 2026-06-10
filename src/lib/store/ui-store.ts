import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  isCollapsed: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleCollapse: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  isCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
}))
