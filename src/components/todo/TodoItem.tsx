
import { useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Trash2, Clock, Tag, Calendar, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Todo } from '@/lib/supabase'

// Category colors for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  personal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  work: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  shopping: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  health: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

// Time estimate colors based on duration
const getTimeEstimateColor = (estimate: string): string => {
  if (estimate.includes('min') || estimate === '1hr') {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'; // Short tasks
  } else if (['1.5hrs', '2hrs', '2.5hrs', '3hrs'].includes(estimate)) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'; // Medium tasks
  } else if (['4hrs', '5hrs', '6hrs', '8hrs'].includes(estimate)) {
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'; // Long tasks
  } else {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'; // Very long tasks (days/week)
  }
};

interface TodoItemProps {
  todo: Todo
  onDelete: (id: string) => Promise<void>
}

export function TodoItem({ todo, onDelete }: TodoItemProps) {
  const [isComplete, setIsComplete] = useState(todo.is_complete)
  const [isUpdating, setIsUpdating] = useState(false)

  const toggleTodo = async () => {
    setIsUpdating(true)
    
    try {
      const newStatus = !isComplete
      setIsComplete(newStatus)
      
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: newStatus })
        .eq('id', todo.id)

      if (error) throw error
    } catch (error: any) {
      // Revert optimistic update on error
      setIsComplete(isComplete)
      toast.error('Error updating todo')
      console.error('Error updating todo:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const isPastDue = todo.due_date && new Date(todo.due_date) < new Date() && !isComplete

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border p-4 transition-all hover:shadow-md",
        isComplete ? "bg-muted/50" : "bg-card",
        isPastDue && !isComplete ? "border-red-300 dark:border-red-800" : ""
      )}
    >
      <div className="flex h-6 items-center">
        <Checkbox
          checked={isComplete}
          onCheckedChange={toggleTodo}
          disabled={isUpdating}
          className={cn(
            "transition-all",
            isComplete ? "opacity-70" : ""
          )}
        />
      </div>
      
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between">
          <span 
            className={cn(
              "text-base font-medium transition-all",
              isComplete ? "text-muted-foreground line-through" : ""
            )}
          >
            {todo.title}
          </span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive" 
                onClick={() => onDelete(todo.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <Badge variant="outline" className={`${CATEGORY_COLORS[todo.category]} capitalize`}>
              {todo.category}
            </Badge>
          </div>
          
          {todo.time_estimate && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline" className={`${getTimeEstimateColor(todo.time_estimate)}`}>
                {todo.time_estimate}
              </Badge>
            </div>
          )}
          
          {todo.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className={cn(
                "text-xs",
                isPastDue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"
              )}>
                {isPastDue ? 'Past due: ' : ''}
                {format(new Date(todo.due_date), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-1 text-xs text-muted-foreground">
          Created {format(new Date(todo.created_at), 'MMM d, yyyy')}
        </div>
      </div>
    </div>
  )
}