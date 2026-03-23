import { test, expect, type Page } from '@playwright/test'

// ─── Helpers ───────────────────────────────────────────────────────────────

async function gotoChat(page: Page) {
  // Use domcontentloaded — app polls /api/conversations every 5s so
  // networkidle is never reached
  await page.goto('/chat', { waitUntil: 'domcontentloaded' })
  // Wait until the composer textarea mounts
  await page.waitForSelector('textarea', { timeout: 20_000 })
}

async function waitForAIResponse(page: Page, timeoutMs = 60_000) {
  // Wait for assistant message to appear AND have non-empty text content
  await page.waitForFunction(
    () => {
      const msgs = document.querySelectorAll('[data-role="assistant"]')
      for (const m of Array.from(msgs)) {
        if ((m.textContent || '').trim().length > 10) return true
      }
      return false
    },
    { timeout: timeoutMs }
  )
}

async function waitForComposerReady(page: Page) {
  // Wait for the ComposerPrimitive.Input (data-slot=composer-input) to be active
  await page.waitForFunction(() => {
    const ta = document.querySelector('textarea[data-slot="composer-input"]') as HTMLTextAreaElement | null
    if (!ta) return false
    return ta.getAttribute('aria-hidden') !== 'true' && !ta.disabled
  }, { timeout: 30_000 })
}

// ─── 1. Page load & redirect ────────────────────────────────────────────────
test('1. redirects / to /chat', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/chat/, { timeout: 10_000 })
})

test('2. /chat returns 200 and mounts React app', async ({ page }) => {
  const resp = await page.goto('/chat', { waitUntil: 'domcontentloaded' })
  expect(resp?.status()).toBe(200)
  await page.waitForSelector('textarea', { timeout: 20_000 })
  const bodyText = await page.locator('body').innerText()
  expect(bodyText.length).toBeGreaterThan(10)
})

test('3. Next.js static assets load without 404', async ({ page }) => {
  const failed: string[] = []
  page.on('response', (res) => {
    if (res.url().includes('/_next/static') && res.status() !== 200) {
      failed.push(`${res.status()} ${res.url()}`)
    }
  })
  await page.goto('/chat', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  if (failed.length) console.log('Failed assets:', failed)
  expect(failed).toEqual([])
})

// ─── 2. Welcome screen ──────────────────────────────────────────────────────
test('4. welcome screen: logo, heading, 4 suggestion chips', async ({ page }) => {
  await gotoChat(page)

  await expect(page.getByText('Hello there!')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Upload receipt')).toBeVisible()
  await expect(page.getByText('Import Excel')).toBeVisible()
  await expect(page.getByText('Ask GST rules')).toBeVisible()
  await expect(page.getByText('BAS preparation')).toBeVisible()
})

// ─── 3. Sidebar ─────────────────────────────────────────────────────────────
test('5. sidebar: New Chat button is visible', async ({ page }) => {
  await gotoChat(page)
  const btn = page.getByRole('button', { name: /new chat/i })
  await expect(btn).toBeVisible({ timeout: 10_000 })
})

test('6. sidebar: settings gear is visible', async ({ page }) => {
  await gotoChat(page)
  const btn = page.getByRole('button', { name: /open settings/i })
  await expect(btn).toBeVisible({ timeout: 10_000 })
})

test('7. New Chat button navigates to /chat/<uuid>', async ({ page }) => {
  await gotoChat(page)
  await page.getByRole('button', { name: /new chat/i }).click()
  await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 15_000 })
})

// ─── 4. Settings modal ──────────────────────────────────────────────────────
test('8. settings modal: opens and closes', async ({ page }) => {
  await gotoChat(page)
  await page.getByRole('button', { name: /open settings/i }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 5_000 })
  await page.getByRole('button', { name: /close settings/i }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeHidden({ timeout: 5_000 })
})

// ─── 5. Composer ────────────────────────────────────────────────────────────
test('9. composer: textarea accepts text', async ({ page }) => {
  await gotoChat(page)
  const ta = page.locator('textarea').first()
  await ta.fill('Hello E2E test')
  await expect(ta).toHaveValue('Hello E2E test')
})

test('10. composer: attach file button present', async ({ page }) => {
  await gotoChat(page)
  const btn = page.getByRole('button', { name: /attach file/i })
  await expect(btn).toBeVisible({ timeout: 10_000 })
})

// ─── 6. Suggestion chip → full send flow ─────────────────────────────────────
test('11. suggestion chip: sends message and gets AI response', async ({ page }) => {
  await gotoChat(page)

  // Click "Ask GST rules" suggestion chip
  await page.getByText('Ask GST rules').click()

  // Must navigate to a conversation
  await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 15_000 })

  // User message appears
  await expect(page.locator('[data-role="user"]')).toBeVisible({ timeout: 10_000 })

  // Waiting indicator may appear
  try {
    await expect(page.getByText(/waiting for ai/i)).toBeVisible({ timeout: 8_000 })
    console.log('  ✔ "Waiting for AI" indicator shown')
  } catch {
    console.log('  ℹ Waiting indicator gone before check (fast response)')
  }

  // AI response arrives
  await waitForAIResponse(page, 60_000)
  const reply = page.locator('[data-role="assistant"]').first()
  const text = await reply.innerText()
  expect(text.trim().length).toBeGreaterThan(20)
  console.log('  ✔ AI reply:', text.trim().slice(0, 120))
})

// ─── 7. Manual message send ──────────────────────────────────────────────────
test('12. manual send: type + click send → AI replies', async ({ page }) => {
  await gotoChat(page)

  await page.locator('textarea').first().fill('What is GST in Australia? Answer in 2 sentences.')
  await page.getByRole('button', { name: /send message/i }).click()

  await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 15_000 })
  await expect(page.locator('[data-role="user"]')).toBeVisible({ timeout: 10_000 })
  await waitForAIResponse(page, 60_000)

  const reply = await page.locator('[data-role="assistant"]').first().innerText()
  expect(reply.trim().length).toBeGreaterThan(20)
  console.log('  ✔ Manual send reply:', reply.trim().slice(0, 120))
})

// ─── 8. Continue conversation (2nd message) ──────────────────────────────────
test('13. follow-up message in existing conversation', async ({ page }) => {
  await gotoChat(page)

  // First message
  await page.locator('textarea').first().fill('Hello')
  await page.getByRole('button', { name: /send message/i }).click()
  await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 15_000 })
  await waitForAIResponse(page, 60_000)

  // Wait for pipeline to complete before second message
  await waitForComposerReady(page)

  // Second message — target the composer input directly by data-slot
  const ta2 = page.locator('textarea[data-slot="composer-input"]')
  await ta2.click()
  await page.keyboard.type('What is the GST rate in Australia?')
  await page.getByRole('button', { name: /send message/i }).click()

  // Should now have 2 user messages
  await page.waitForFunction(
    () => document.querySelectorAll('[data-role="user"]').length >= 2,
    { timeout: 15_000 }
  )
  // And eventually 2 assistant messages
  await page.waitForFunction(
    () => document.querySelectorAll('[data-role="assistant"]').length >= 2,
    { timeout: 60_000 }
  )
  console.log('  ✔ Multi-turn conversation works')
})

// ─── 9. Conversation in sidebar ──────────────────────────────────────────────
test('14. conversation appears in sidebar after sending', async ({ page }) => {
  await gotoChat(page)

  await page.locator('textarea').first().fill('E2E sidebar test')
  await page.getByRole('button', { name: /send message/i }).click()
  await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 15_000 })

  // Wait for title to populate (Qwen generates it async)
  await page.waitForTimeout(5000)

  // At least one conversation row in sidebar
  const sidebar = page.locator('aside').first()
  const convItems = sidebar.locator('[role="button"]')
  const count = await convItems.count()
  expect(count).toBeGreaterThan(0)
  console.log(`  ✔ ${count} conversation(s) in sidebar`)
})

// ─── 10. Inspector panel ──────────────────────────────────────────────────────
test('15. inspector panel: visible and shows empty state', async ({ page }) => {
  await gotoChat(page)

  // Inspector is rightmost aside (desktop)
  const inspectors = page.locator('aside')
  const count = await inspectors.count()
  expect(count).toBeGreaterThanOrEqual(1)

  // Empty state message — use first() since both desktop + mobile inspectors render it
  const emptyMsg = page.getByText(/upload a receipt|open a conversation/i).first()
  await expect(emptyMsg).toBeVisible({ timeout: 10_000 })
  console.log('  ✔ Inspector empty state shown')
})

// ─── 11. Keyboard: Enter sends message ───────────────────────────────────────
test('16. pressing Enter in composer sends message', async ({ page }) => {
  await gotoChat(page)

  const ta = page.locator('textarea').first()
  await ta.fill('Enter key test')
  await ta.press('Enter')

  await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 15_000 })
  await expect(page.locator('[data-role="user"]')).toBeVisible({ timeout: 10_000 })
  console.log('  ✔ Enter key triggers send')
})
