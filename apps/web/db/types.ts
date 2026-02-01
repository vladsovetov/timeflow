/**
 * Database schema types for Kysely.
 * Extend this interface as tables are added via migrations.
 */
export interface Database {
  timer_category: {
    id: string
    user_id: string | null
    name: string
    color: string
    sort_order: number
  }
  timer_type_enum: {
    key: string
    name: string
    description: string | null
    sort_order: number
  }
  user: {
    id: string
    clerk_user_id: string
    first_name: string | null
    last_name: string | null
    timezone: string | null
    language: string | null
    is_deleted: boolean
    created_at: Date
    updated_at: Date
    updated_by: string | null
  }
  timer: {
    id: string
    user_id: string
    timer_type: string
    category_id: string | null
    name: string
    color: string | null
    sort_order: number
    min_time: number | null
    is_archived: boolean
    is_deleted: boolean
    created_at: Date
    updated_at: Date
    updated_by: string | null
  }
  timer_session: {
    id: string
    user_id: string
    timer_id: string
    started_at: Date
    ended_at: Date | null
    original_started_at: Date | null
    original_ended_at: Date | null
    source: string
    note: string | null
    is_deleted: boolean
    created_at: Date
    updated_at: Date
    updated_by: string | null
  }
}
