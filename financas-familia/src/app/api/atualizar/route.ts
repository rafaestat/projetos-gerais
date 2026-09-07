import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { CACHE_TAG } from '@/lib/config';

export async function POST() {
  revalidateTag(CACHE_TAG);
  return NextResponse.json({ ok: true, em: new Date().toISOString() });
}
