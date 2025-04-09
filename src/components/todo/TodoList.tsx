
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Todo } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { Loader2, Trash2, Calendar as CalendarIcon, Filter } from 'lucide-react'
import { format } from 'date-fns'

const CATEGORIES = ['personal', 'work', 'shopping', 'health', 'other'] as const
type Category = typeof CATEGORIES[number]

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<Category>('personal')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all')

  useEffect(() => {
    fetchTodos()
    
    const subscription = supabase
      .channel('todos')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'todos' 
      }, 
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setTodos(current => [...current, payload.new as Todo])
        } else if (payload.eventType === 'DELETE') {
          setTodos(current => current.filter(todo => todo.id !== payload.old.id))
        } else if (payload.eventType === 'UPDATE') {
          setTodos(current => 
            current.map(todo => 
              todo.id === payload.new.id ? { ...todo, ...payload.new } : todo
            )
          )
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchTodos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true, nullsLast: true })

      if (error) throw error
      setTodos(data || [])
    } catch (error: any) {
      toast.error('Error fetching todos')
    } finally {
      setLoading(false)
    }
  }

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { error } = await supabase
        .from('todos')
        .insert([{ 
          title: newTodo.trim(), 
          user_id: user.id,
          category: selectedCategory,
          due_date: selectedDate?.toISOString() || null
        }])

      if (error) throw error
      setNewTodo('')
      setSelectedDate(null)
      toast.success('Todo added!')
    } catch (error: any) {
      toast.error('Error adding todo')
    }
  }

  const toggleTodo = async (todo: Todo) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: !todo.is_complete })
        .eq('id', todo.id)

      if (error) throw error
    } catch (error: any) {
      toast.error('Error updating todo')
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Todo deleted!')
    } catch (error: any) {
      toast.error('Error deleting todo')
    }
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) toast.error('Error signing out')
  }

  const filteredTodos = todos.filter(todo => 
    filterCategory === 'all' || todo.category === filterCategory
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Todos</h1>
        <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
      </div>

      <form onSubmit={addTodo} className="mb-6 space-y-4 rounded-lg border p-4 shadow-sm">
        <div className="flex gap-2">
          <Input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new todo..."
            className="flex-1"
          />
          <Button type="submit">Add</Button>
        </div>

        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as Category)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(category => (
                <SelectItem key={category} value={category} className="capitalize">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={selectedDate ? 'text-foreground' : 'text-muted-foreground'}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : 'Pick a due date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </form>

      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value as Category | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(category => (
              <SelectItem key={category} value={category} className="capitalize">
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filteredTodos.length === 0 ? (
          <p className="text-center text-gray-500">No todos yet. Add one above!</p>
        ) : (
          filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={todo.is_complete}
                  onCheckedChange={() => toggleTodo(todo)}
                />
                <div className="flex flex-col">
                  <span className={todo.is_complete ? 'text-gray-400 line-through' : ''}>
                    {todo.title}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="capitalize">{todo.category}</span>
                    {todo.due_date && (
                      <>
                        <span>•</span>
                        <span>{format(new Date(todo.due_date), 'PPP')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteTodo(todo.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}