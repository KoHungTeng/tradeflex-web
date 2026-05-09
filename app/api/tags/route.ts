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
  const { name: newName } = await req.json()

  // 取得舊標籤名稱
  const { data: oldTag } = await supabase.from('tags').select('name').eq('id', id).eq('user_id', user.id).single()
  if (!oldTag) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const oldTagStr = `#${oldTag.name}`
  const newTagStr = `#${newName}`

  // 更新標籤名稱
  const { error } = await supabase.from('tags').update({ name: newName }).eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error }, { status: 500 })

  // 同步更新 trades 的 remark
  const { data: trades } = await supabase.from('trades').select('id, remark').eq('user_id', user.id)
  if (trades) {
    for (const trade of trades) {
      if (trade.remark?.includes(oldTagStr)) {
        await supabase.from('trades').update({ remark: trade.remark.replaceAll(oldTagStr, newTagStr) }).eq('id', trade.id)
      }
    }
  }

  // 同步更新 completed_trades 的 remark, open_remark, close_remark
  const { data: completed } = await supabase.from('completed_trades').select('id, remark, open_remark, close_remark').eq('user_id', user.id)
  if (completed) {
    for (const trade of completed) {
      const updates: any = {}
      if (trade.remark?.includes(oldTagStr)) updates.remark = trade.remark.replaceAll(oldTagStr, newTagStr)
      if (trade.open_remark?.includes(oldTagStr)) updates.open_remark = trade.open_remark.replaceAll(oldTagStr, newTagStr)
      if (trade.close_remark?.includes(oldTagStr)) updates.close_remark = trade.close_remark.replaceAll(oldTagStr, newTagStr)
      if (Object.keys(updates).length > 0) {
        await supabase.from('completed_trades').update(updates).eq('id', trade.id)
      }
    }
  }

  return NextResponse.json({ success: true })
}