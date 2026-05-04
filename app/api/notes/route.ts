import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getSupabaseAndUser() {
  // @ts-ignore
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name) { return cookieStore.get(name)?.value }, set() {}, remove() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET() {
  const { supabase, user } = await getSupabaseAndUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('day_notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { supabase, user } = await getSupabaseAndUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { content, date } = await req.json()
  const note_date = date || new Date().toISOString().split('T')[0]
  const { data, error } = await supabase.from('day_notes').insert({ text: content, note_date, user_id: user.id }).select().single()
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const { supabase, user } = await getSupabaseAndUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const { error } = await supabase.from('day_notes').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}