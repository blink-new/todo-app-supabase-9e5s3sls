
import { ThemeProvider } from '@/components/theme-provider'
import { TodoLayout } from '@/components/todo/TodoLayout'
import { Toaster } from 'sonner'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="todosaas-theme">
      <Toaster richColors position="top-right" />
      <TodoLayout />
    </ThemeProvider>
  )
}

export default App