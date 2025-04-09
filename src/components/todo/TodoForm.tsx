
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'

interface TodoFormProps {
  onAddTodo: (title: string) => void
}

export function TodoForm({ onAddTodo }: TodoFormProps) {
  const [title, setTitle] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      onAddTodo(title.trim())
      setTitle('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <Input
        type="text"
        placeholder="Add a new task..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" disabled={!title.trim()}>
        <Plus className="h-4 w-4 mr-2" />
        Add
      </Button>
    </form>
  )
}