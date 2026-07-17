import React from 'react'

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function useAuthModal() {
  return {
    isOpen: false,
    openModal: () => {},
    closeModal: () => {},
  }
}
