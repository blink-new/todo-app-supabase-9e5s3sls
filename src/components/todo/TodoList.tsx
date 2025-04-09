
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { categorizeTodo, estimateTime } from '@/lib/api'
import type { Todo } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { Loader2, Trash2, Calendar as CalendarIcon, Filter, Sparkles, Tag, Clock, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

const CATEGORIES = ['personal', 'work', 'shopping', 'health', 'other'] as const
type Category = typeof CATEGORIES[number]

// Time estimates
const TIME_ESTIMATES = [
  '5min', '10min', '15min', '20min', '30min', '45min', 
  '1hr', '1.5hrs', '2hrs', '2.5hrs', '3hrs', '4hrs', '5hrs', 
  '6hrs', '8hrs', '1day', '2days', '3days', '1week'
] as const
type TimeEstimate = typeof TIME_ESTIMATES[number]

// Sort options
type SortOrder = 'created_asc' | 'created_desc' | 'due_asc' | 'due_desc'

// Category colors for visual distinction
const CATEGORY_COLORS: Record<Category, string> = {
  personal: 'bg-blue-100 text-blue-800',
  work: 'bg-purple-100 text-purple-800',
  shopping: 'bg-green-100 text-green-800',
  health: 'bg-red-100 text-red-800',
  other: 'bg-gray-100 text-gray-800',
}

// Time estimate colors based on duration
const getTimeEstimateColor = (estimate: string): string => {
  if (estimate.includes('min') || estimate === '1hr') {
    return 'bg-green-100 text-green-800'; // Short tasks
  } else if (['1.5hrs', '2hrs', '2.5hrs', '3hrs'].includes(estimate)) {
    return 'bg-yellow-100 text-yellow-800'; // Medium tasks
  } else if (['4hrs', '5hrs', '6hrs', '8hrs'].includes(estimate)) {
    return 'bg-orange-100 text-orange-800'; // Long tasks
  } else {
    return 'bg-red-100 text-red-800'; // Very long tasks (days/week)
  }
};

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<Category>('personal')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTimeEstimate, setSelectedTimeEstimate] = useState<TimeEstimate>('30min')
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('created_desc')
  const [isCategorizing, setIsCategorizing] = useState(false)
  const [isEstimating, setIsEstimating] = useState(false)
  const [useAI, setUseAI] = useState(true)
  const [suggestedCategory, setSuggestedCategory] = useState<Category | null>(null)
  const [suggestedTimeEstimate, setSuggestedTimeEstimate] = useState<TimeEstimate | null>(null)
  
  // Debounce timer reference
  const debounceTimerRef = useRef<number | null>(null)
  const timeEstimateTimerRef = useRef<number | null>(null)

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
        if (payload.eventType === 'INSERT' && !todos.some(t => t.id === payload.new.id)) {
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

      let query = supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
      
      // Apply sorting based on current sort order
      if (sortOrder === 'created_asc') {
        query = query.order('created_at', { ascending: true })
      } else if (sortOrder === 'created_desc') {
        query = query.order('created_at', { ascending: false })
      } else if (sortOrder === 'due_asc') {
        query = query.order('due_date', { ascending: true, nullsLast: true })
      } else if (sortOrder === 'due_desc') {
        query = query.order('due_date', { ascending: false, nullsFirst: true })
      }

      const { data, error } = await query

      if (error) throw error
      setTodos(data || [])
    } catch (error: any) {
      toast.error('Error fetching todos')
    } finally {
      setLoading(false)
    }
  }

  // Refetch todos when sort order changes
  useEffect(() => {
    if (!loading) {
      fetchTodos()
    }
  }, [sortOrder])

  // Properly debounced function to get category suggestions
  const debouncedGetSuggestion = (todoText: string) => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
    }

    // Only proceed if we have text and AI is enabled
    if (!todoText.trim() || !useAI) {
      setSuggestedCategory(null)
      return
    }

    // Set a new timer
    debounceTimerRef.current = window.setTimeout(async () => {
      setIsCategorizing(true)
      try {
        const category = await categorizeTodo(todoText.trim()) as Category
        setSuggestedCategory(category)
      } catch (error) {
        console.error('Error previewing category:', error)
        setSuggestedCategory(null)
      } finally {
        setIsCategorizing(false)
      }
    }, 800) // 800ms debounce
  }

  // Debounced function to get time estimates
  const debouncedGetTimeEstimate = (todoText: string) => {
    // Clear any existing timer
    if (timeEstimateTimerRef.current) {
      window.clearTimeout(timeEstimateTimerRef.current)
    }

    // Only proceed if we have text and AI is enabled
    if (!todoText.trim() || !useAI) {
      setSuggestedTimeEstimate(null)
      return
    }

    // Set a new timer
    timeEstimateTimerRef.current = window.setTimeout(async () => {
      setIsEstimating(true)
      try {
        const timeEstimate = await estimateTime(todoText.trim()) as TimeEstimate
        setSuggestedTimeEstimate(timeEstimate)
      } catch (error) {
        console.error('Error estimating time:', error)
        setSuggestedTimeEstimate(null)
      } finally {
        setIsEstimating(false)
      }
    }, 1000) // 1000ms debounce
  }

  // Call debounced functions when todo text changes
  useEffect(() => {
    debouncedGetSuggestion(newTodo)
    debouncedGetTimeEstimate(newTodo)
    
    // Cleanup function to clear timers if component unmounts or newTodo changes again
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
      if (timeEstimateTimerRef.current) {
        window.clearTimeout(timeEstimateTimerRef.current)
      }
    }
  }, [newTodo, useAI])

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    // Define optimisticTodo outside the try block so it's accessible in the catch block
    let optimisticTodo: Todo | null = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Use suggested category if available, otherwise use selected or get a new one
      let category: Category
      let timeEstimate: TimeEstimate
      
      if (useAI) {
        // Handle category
        if (suggestedCategory) {
          category = suggestedCategory
        } else {
          setIsCategorizing(true)
          try {
            category = await categorizeTodo(newTodo.trim()) as Category
          } catch (error) {
            console.error('Error categorizing:', error)
            category = selectedCategory // Fall back to selected category if AI fails
          } finally {
            setIsCategorizing(false)
          }
        }

        // Handle time estimate
        if (suggestedTimeEstimate) {
          timeEstimate = suggestedTimeEstimate
        } else {
          setIsEstimating(true)
          try {
            timeEstimate = await estimateTime(newTodo.trim()) as TimeEstimate
          } catch (error) {
            console.error('Error estimating time:', error)
            timeEstimate = selectedTimeEstimate // Fall back to selected time if AI fails
          } finally {
            setIsEstimating(false)
          }
        }
      } else {
        category = selectedCategory
        timeEstimate = selectedTimeEstimate
      }

      // Create optimistic todo
      optimisticTodo = {
        id: crypto.randomUUID(), // Temporary ID
        title: newTodo.trim(),
        user_id: user.id,
        category,
        time_estimate: timeEstimate,
        due_date: selectedDate?.toISOString() || null,
        is_complete: false,
        created_at: new Date().toISOString(),
      }

      // Optimistically update UI
      setTodos(current => [...current, optimisticTodo!])
      setNewTodo('')
      setSelectedDate(null)
      setSuggestedCategory(null)
      setSuggestedTimeEstimate(null)

      // Make API call - using insert directly without specifying columns
      const { data, error } = await supabase
        .from('todos')
        .insert({ 
          title: optimisticTodo.title, 
          user_id: optimisticTodo.user_id,
          category: optimisticTodo.category,
          time_estimate: optimisticTodo.time_estimate,
          due_date: optimisticTodo.due_date
        })
        .select()
        .single()

      if (error) throw error

      // Update the temporary ID with the real one
      setTodos(current => 
        current.map(todo => 
          todo.id === optimisticTodo!.id ? data : todo
        )
      )

      if (useAI) {
        toast.success(`Todo added! AI categorized as: ${category} (${timeEstimate})`)
      } else {
        toast.success('Todo added!')
      }
    } catch (error: any) {
      console.error('Error adding todo:', error)
      // Revert optimistic update on error
      if (optimisticTodo) {
        setTodos(current => current.filter(todo => todo.id !== optimisticTodo?.id))
      }
      toast.error(`Error adding todo: ${error.message}`)
    }
  }

  const toggleTodo = async (todo: Todo) => {
    // Optimistically update UI
    setTodos(current =>
      current.map(t =>
        t.id === todo.id ? { ...t, is_complete: !t.is_complete } : t
      )
    )

    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: !todo.is_complete })
        .eq('id', todo.id)

      if (error) throw error
    } catch (error: any) {
      // Revert optimistic update on error
      setTodos(current =>
        current.map(t =>
          t.id === todo.id ? { ...t, is_complete: todo.is_complete } : t
        )
      )
      toast.error('Error updating todo')
    }
  }

  const deleteTodo = async (id: string) => {
    // Store the todo for potential recovery
    const todoToDelete = todos.find(t => t.id === id)
    
    // Optimistically update UI
    setTodos(current => current.filter(todo => todo.id !== id))

    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Todo deleted!')
    } catch (error: any) {
      // Revert optimistic update on error
      if (todoToDelete) {
        setTodos(current => [...current, todoToDelete])
      }
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

  // Get sort icon based on current sort order
  const getSortIcon = () => {
    if (sortOrder === 'created_asc') return <ArrowUp className="h-4 w-4" />
    if (sortOrder === 'created_desc') return <ArrowDown className="h-4 w-4" />
    return <ArrowUpDown className="h-4 w-4" />
  }

  // Toggle sort order between created_asc and created_desc
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'created_asc' ? 'created_desc' : 'created_asc')
  }

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
            disabled={isCategorizing || isEstimating}
          />
          <Button type="submit" disabled={isCategorizing || isEstimating || !newTodo.trim()}>
            {isCategorizing || isEstimating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {useAI && suggestedCategory && newTodo.trim() && (
            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-3.5 w-3.5 text-gray-500" />
              <span>AI suggests category:</span>
              <Badge variant="outline" className={`${CATEGORY_COLORS[suggestedCategory]} capitalize`}>
                {suggestedCategory}
              </Badge>
            </div>
          )}

          {useAI && suggestedTimeEstimate && newTodo.trim() && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 text-gray-500" />
              <span>AI estimates time:</span>
              <Badge variant="outline" className={`${getTimeEstimateColor(suggestedTimeEstimate)}`}>
                {suggestedTimeEstimate}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center">
            <Button
              type="button"
              variant={useAI ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setUseAI(!useAI)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {useAI ? 'AI Assistance On' : 'AI Assistance Off'}
            </Button>
          </div>

          {!useAI && (
            <>
              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as Category)}>
                <SelectTrigger className="w-[150px]">
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

              <Select value={selectedTimeEstimate} onValueChange={(value) => setSelectedTimeEstimate(value as TimeEstimate)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Time Estimate" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_ESTIMATES.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

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

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2">
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Newest first</SelectItem>
              <SelectItem value="created_asc">Oldest first</SelectItem>
              <SelectItem value="due_asc">Due date (ascending)</SelectItem>
              <SelectItem value="due_desc">Due date (descending)</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleSortOrder}
            title={sortOrder === 'created_asc' ? 'Sort newest first' : 'Sort oldest first'}
          >
            {getSortIcon()}
          </Button>
        </div>
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
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline" className={`${CATEGORY_COLORS[todo.category]} capitalize`}>
                      {todo.category}
                    </Badge>
                    {todo.time_estimate && (
                      <Badge variant="outline" className={`${getTimeEstimateColor(todo.time_estimate)}`}>
                        {todo.time_estimate}
                      </Badge>
                    )}
                    {todo.due_date && (
                      <span className="text-gray-500">
                        {format(new Date(todo.due_date), 'PPP')}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      Created: {format(new Date(todo.created_at), 'MMM d, yyyy')}
                    </span>
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