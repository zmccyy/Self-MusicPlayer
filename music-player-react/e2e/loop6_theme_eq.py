"""E2E test for Loop 6: theme toggle actually changes colors (light/dark)."""
import sys

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(BASE)
        page.wait_for_load_state('networkidle')

        def body_bg():
            return page.evaluate("getComputedStyle(document.body).backgroundColor")

        def html_theme():
            return page.evaluate("document.documentElement.dataset.theme")

        start_bg = body_bg()
        start_theme = html_theme()
        assert start_theme in ('dark', 'light'), 'data-theme not set'

        page.locator('[data-theme-toggle]').click()
        page.wait_for_timeout(400)
        toggled_bg = body_bg()
        expected = 'light' if start_theme == 'dark' else 'dark'
        assert html_theme() == expected, f'theme did not flip to {expected}'
        assert toggled_bg != start_bg, f'theme toggle did not change bg: {start_bg} vs {toggled_bg}'
        print(f'PASS [theme]: {start_theme} -> {expected}, bg {start_bg} -> {toggled_bg}')

        # reload keeps the toggled theme (persisted)
        page.reload()
        page.wait_for_load_state('networkidle')
        assert html_theme() == expected, 'theme not persisted after reload'
        print(f'PASS [persist]: {expected} theme survives reload')

        # 10-band EQ renders
        page.locator('button[aria-label="展开播放面板"]').click()
        page.wait_for_timeout(500)
        page.get_by_role('button', name='收起').click()
        page.locator('button[aria-label="打开均衡器"]').click()
        page.wait_for_timeout(600)
        sliders = page.locator('[role="dialog"] [role="slider"]')
        assert sliders.count() == 10, f'expected 10 EQ bands, got {sliders.count()}'
        preset_names = ' '.join(
            page.locator('[role="dialog"] select option').all_inner_texts()
        )
        for name in ['爵士', '电子', '人声']:
            assert name in preset_names, f'preset {name} missing'
        print('PASS [eq]: 10 bands + jazz/electronic/vocal presets render')

        page.screenshot(path='e2e-loop6.png', full_page=True)
        browser.close()
        print('E2E LOOP 6: ALL PASS')


if __name__ == '__main__':
    main()
    sys.exit(0)
