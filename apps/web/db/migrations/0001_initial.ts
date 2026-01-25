import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Enable pgcrypto extension for gen_random_uuid()
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`.execute(db)

  // Create timer_type_enum table (enum table, no audit fields)
  await db.schema
    .createTable('timer_type_enum')
    .addColumn('key', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('sort_order', 'integer', (col) => col.notNull().defaultTo(0))
    .execute()

  // Insert seed data for timer_type_enum
  await sql`
    INSERT INTO timer_type_enum (key, name, description, sort_order) VALUES
    ('work', 'Work', 'Work-related activities', 0),
    ('study', 'Study', 'Learning and studying', 1),
    ('exercise', 'Exercise', 'Physical exercise and fitness', 2),
    ('break', 'Break', 'Rest and relaxation breaks', 3),
    ('personal', 'Personal', 'Personal activities', 4),
    ('focus', 'Focus', 'Focused work sessions', 5),
    ('meeting', 'Meeting', 'Meetings and discussions', 6),
    ('hobby', 'Hobby', 'Hobbies and interests', 7),
    ('health', 'Health', 'Health-related activities', 8),
    ('sleep', 'Sleep', 'Sleep and rest', 9),
    ('other', 'Other', 'Other activities', 10)
  `.execute(db)

  // Create user table
  await db.schema
    .createTable('user')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('clerk_user_id', 'text', (col) => col.notNull())
    .addColumn('is_deleted', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_by', 'uuid', (col) =>
      col.references('user.id')
    )
    .execute()

  // Create unique index on clerk_user_id where is_deleted = false
  await sql`
    CREATE UNIQUE INDEX user_clerk_user_id_unique 
    ON "user" (clerk_user_id) 
    WHERE is_deleted = false
  `.execute(db)

  // Create timer table
  await db.schema
    .createTable('timer')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('user.id').onDelete('cascade').notNull()
    )
    .addColumn('timer_type', 'text', (col) =>
      col.references('timer_type_enum.key').notNull()
    )
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('color', 'text')
    .addColumn('sort_order', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('is_archived', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('is_deleted', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_by', 'uuid', (col) =>
      col.references('user.id')
    )
    .execute()

  // Create indexes for timer table
  await sql`
    CREATE INDEX timer_user_id_timer_type_is_deleted_idx 
    ON timer (user_id, timer_type, is_deleted)
  `.execute(db)

  await sql`
    CREATE INDEX timer_user_id_is_deleted_is_archived_sort_order_idx 
    ON timer (user_id, is_deleted, is_archived, sort_order)
  `.execute(db)

  await sql`
    CREATE UNIQUE INDEX timer_user_id_name_unique 
    ON timer (user_id, name) 
    WHERE is_deleted = false
  `.execute(db)

  // Create timer_session table
  await db.schema
    .createTable('timer_session')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('user.id').onDelete('cascade').notNull()
    )
    .addColumn('timer_id', 'uuid', (col) =>
      col.references('timer.id').onDelete('cascade').notNull()
    )
    .addColumn('started_at', 'timestamptz', (col) => col.notNull())
    .addColumn('ended_at', 'timestamptz')
    .addColumn('source', 'text', (col) => col.notNull().defaultTo('manual'))
    .addColumn('note', 'text')
    .addColumn('is_deleted', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_by', 'uuid', (col) =>
      col.references('user.id')
    )
    .execute()

  // Add check constraint for timer_session: ended_at is null OR ended_at > started_at
  await sql`
    ALTER TABLE timer_session 
    ADD CONSTRAINT timer_session_ended_at_check 
    CHECK (ended_at IS NULL OR ended_at > started_at)
  `.execute(db)

  // Create indexes for timer_session table
  await sql`
    CREATE INDEX timer_session_user_id_started_at_idx 
    ON timer_session (user_id, started_at) 
    WHERE is_deleted = false
  `.execute(db)

  await sql`
    CREATE INDEX timer_session_user_id_timer_id_started_at_idx 
    ON timer_session (user_id, timer_id, started_at) 
    WHERE is_deleted = false
  `.execute(db)

  // Create partial unique index: one active session per user+timer
  await sql`
    CREATE UNIQUE INDEX timer_session_user_id_timer_id_active_unique 
    ON timer_session (user_id, timer_id) 
    WHERE ended_at IS NULL AND is_deleted = false
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables in reverse order
  await db.schema.dropTable('timer_session').execute()
  await db.schema.dropTable('timer').execute()
  await db.schema.dropTable('user').execute()
  await db.schema.dropTable('timer_type_enum').execute()

  // Drop pgcrypto extension
  await sql`DROP EXTENSION IF EXISTS pgcrypto`.execute(db)
}
