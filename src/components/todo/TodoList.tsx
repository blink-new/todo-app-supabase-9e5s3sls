
import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { motion, AnimatePresence } from 'framer-motion'

interface Todo {
  id: string
  title: string
  completed: boolean
}

interface TodoListProps {
  todos: Todo[]
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}

export function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null)

  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-primary/10 p-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-primary"
          >
            <path d="M11 12H3" />
            <path d="M16 6H3" />
            <path d="M16 18H3" />
            <path d="M18 9v6" />
            <path d="M21 12h-6" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium">No tasks yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a task to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {todos.map((todo) => (
          <motion.div
            key={todo.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center space-x-3">
              <Checkbox
                id={`todo-${todo.id}`}
                checked={todo.completed}
                onCheckedChange={(checked) =>
                  onToggle(todo.id, checked as boolean)
                }
              />
              <label
                htmlFor={`todo-${todo.id}`}
                className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                  todo.completed ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {todo.title}
              </label>
            </div>
            <AlertDialog open={todoToDelete === todo.id} onOpenChange={(open) => !open && setTodoToDelete(null)}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTodoToDelete(todo.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your task.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (todoToDelete) {
                        onDelete(todoToDelete)
                        setTodoToDelete(null)
                      }
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}