"""UI review screenshots: dark/light, now-playing, EQ, search."""
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={'width': 1440, 'height': 900})

    # dark main (default)
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.evaluate("document.documentElement.dataset.theme = 'dark'")
    page.wait_for_timeout(1200)
    page.screenshot(path='shot-dark.png')

    # light main
    page.evaluate("document.documentElement.dataset.theme = 'light'")
    page.wait_for_timeout(600)
    page.screenshot(path='shot-light.png')
    page.evaluate("document.documentElement.dataset.theme = 'dark'")

    # now playing (play a long track first)
    page.locator('.song-row').first.hover()
    page.locator('.song-row').first.click()
    page.wait_for_timeout(800)
    page.locator('button[aria-label="展开播放面板"]').click()
    page.wait_for_timeout(1200)
    page.screenshot(path='shot-nowplaying-lyrics.png')
    page.locator('[data-nowplaying-tab="queue"]').click()
    page.wait_for_timeout(600)
    page.screenshot(path='shot-nowplaying-queue.png')
    page.get_by_role('button', name='收起').click()
    page.wait_for_timeout(500)

    # EQ dialog
    page.locator('button[aria-label="打开均衡器"]').click()
    page.wait_for_timeout(800)
    page.screenshot(path='shot-eq.png')
    page.keyboard.press('Escape')
    page.wait_for_timeout(400)

    # search online
    page.get_by_role('button', name='搜索').first.click()
    page.locator('[role="dialog"] button', has_text='在线').first.click()
    page.locator('[role="dialog"] input').first.fill('晴天')
    page.locator('[role="dialog"]').get_by_role('button', name='搜索').click()
    page.wait_for_timeout(2500)
    page.screenshot(path='shot-search.png')

    b.close()
    print('screenshots done')
