import { shadcn } from '@clerk/ui/themes'

export const clerkAppearance = {
  theme: shadcn,
  variables: {
    fontFamily: 'var(--font-sans)',
    colorPrimary: '#C85C39',
    colorBackground: '#FAF9F6',
    colorText: '#1C1B17',
    colorTextSecondary: '#4E4B42',
    colorInputBackground: '#F4F3EE',
    colorInputText: '#1C1B17',
    borderRadius: '12px',
  },
  elements: {
    card: 'shadow-none bg-transparent p-0',
    rootBox: 'w-full',
  }
}
