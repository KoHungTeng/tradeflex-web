import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

async function getSupabaseAndUser(request: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.headers.get('cookie')?.split(';')
            .find(c => c.trim().startsWith(name + '='))
            ?.split('=')[1]
        },
        set() {},
        remove() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET(request: Request) {  // ← 加了 request
  const { supabase, user } = await getSupabaseAndUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('tags').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { supabase, user } = await getSupabaseAndUser(req)  // ← 改成 req
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name } = await req.json()
  const { data, error } = await supabase.from('tags').insert({ name, user_id: user.id }).select().single()
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const { supabase, user } = await getSupabaseAndUser(req)  // ← 改成 req
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const { error } = await supabase.from('tags').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}
export async function PATCH(req: Request) {
  const { supabase, user } = await getSupabaseAndUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { name } = await req.json()
  const { error } = await supabase.from('tags').update({ name }).eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}