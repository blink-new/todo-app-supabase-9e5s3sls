
import { Header } from '@/components/header'
import { TodoList } from '@/components/todo/TodoList'

export function TodoLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6 md:py-10">
        <TodoList />
      </main>
      <footer className="border-t py-4">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TodoSaaS. All rights reserved.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Built with ❤️ using React, Vite, and Supabase
          </p>
        </div>
      </footer>
    </div>
  )
}