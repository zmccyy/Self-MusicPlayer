"""E2E test for Loop 1: library management (edit / delete / scan import)."""
import os
import subprocess
import sys
import tempfile

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'


def make_wav(freq=440, seconds=2, sample_rate=44100):
    import struct

    n = seconds * sample_rate
    data = b''.join(
        struct.pack('<h', int(8000 * (1 if (i // 500) % 2 else -1) * __import__('math').sin(2 * 3.14159 * freq * i / sample_rate)))
        for i in range(n)
    )
    header = (
        b'RIFF' + (36 + len(data)).to_bytes(4, 'little') + b'WAVE'
        + b'fmt ' + (16).to_bytes(4, 'little') + (1).to_bytes(2, 'little') + (1).to_bytes(2, 'little')
        + sample_rate.to_bytes(4, 'little') + (sample_rate * 2).to_bytes(4, 'little')
        + (2).to_bytes(2, 'little') + (16).to_bytes(2, 'little')
        + b'data' + len(data).to_bytes(4, 'little')
    )
    return header + data


def main():
    import random

    # Prepare a scan directory with one unique wav (random freq => unique content hash)
    scan_dir = tempfile.mkdtemp(prefix='scan-e2e-')
    wav_path = os.path.join(scan_dir, 'Scan Artist - Scan Song.wav')
    with open(wav_path, 'wb') as f:
        f.write(make_wav(freq=random.randint(300, 3000)))
    scan_dir_js = scan_dir.replace('\\', '\\\\')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(BASE)
        page.wait_for_load_state('networkidle')

        # 1. Scan import via UI
        page.get_by_role('button', name='扫描导入').click()
        page.get_by_placeholder('例如：D:\\\\Music 或 ~/Music').fill(scan_dir)
        page.get_by_role('button', name='开始扫描').click()
        page.wait_for_timeout(1500)
        body = page.inner_text('body')
        assert '新增 1 首' in body, f'scan result missing: {body[-400:]}'
        assert page.locator('.song-row', has_text='Scan Song').count() >= 1, 'scanned song not in list'
        print('PASS [scan]: folder scan imported 1 track via UI')
        # close the scan dialog so it doesn't block later interactions
        page.locator('[role="dialog"]').get_by_role('button', name='关闭').click()
        page.wait_for_timeout(300)

        # 2. Edit metadata via UI
        row = page.locator('.song-row', has_text='Scan Song').first
        row.hover()
        row.get_by_title('编辑信息').click()
        # modal inputs in order: 标题/歌手/专辑/流派/年份
        inputs = page.locator('[role="dialog"] input')
        inputs.nth(0).fill('Renamed Song')
        inputs.nth(1).fill('Renamed Artist')
        page.get_by_role('button', name='保存').click()
        page.wait_for_timeout(800)
        assert page.locator('.song-row', has_text='Renamed Song').count() >= 1, 'title not updated in UI'
        # verify server-side
        out = subprocess.run(
            ['node', '-e', (
                "fetch('http://localhost:3799/api/tracks').then(r=>r.json()).then(d=>{"
                "const t=d.tracks.find(t=>t.title==='Renamed Song');"
                "console.log(t && t.artist==='Renamed Artist' ? 'SERVER_OK' : 'SERVER_BAD:'+JSON.stringify(t));})"
            )],
            capture_output=True, text=True, cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        )
        assert 'SERVER_OK' in out.stdout, f'server state wrong: {out.stdout} {out.stderr}'
        print('PASS [edit]: metadata updated in UI and on server')

        # 3. Delete via UI (accept the confirm dialog)
        page.on('dialog', lambda d: d.accept())
        row = page.locator('.song-row', has_text='Renamed Song').first
        row.hover()
        row.get_by_title('从曲库删除').click()
        page.wait_for_timeout(800)
        assert page.locator('.song-row', has_text='Renamed Song').count() == 0, 'song still visible after delete'
        out = subprocess.run(
            ['node', '-e', (
                "fetch('http://localhost:3799/api/tracks').then(r=>r.json()).then(d=>{"
                "console.log(d.tracks.some(t=>t.title==='Renamed Song') ? 'STILL_THERE' : 'SERVER_DELETED');})"
            )],
            capture_output=True, text=True, cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        )
        assert 'SERVER_DELETED' in out.stdout, f'server still has track: {out.stdout} {out.stderr}'
        print('PASS [delete]: song removed from UI and server')

        page.screenshot(path='e2e-loop1.png', full_page=True)
        browser.close()
        print('E2E LOOP 1: ALL PASS')


if __name__ == '__main__':
    main()
    sys.exit(0)
