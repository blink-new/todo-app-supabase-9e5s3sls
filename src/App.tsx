
import { ThemeProvider } from '@/components/theme-provider'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Toaster } from 'sonner'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="todosaas-theme">
      <Toaster richColors position="top-right" />
      <AuthLayout />
    </ThemeProvider>
  )
}

export default App