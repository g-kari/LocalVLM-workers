import { test, expect } from '@playwright/test';

test.describe('LocalVLM アプリケーション', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ページが正しく読み込まれる', async ({ page }) => {
    // videoタグが存在する（カメラプレビュー）
    const video = page.locator('video');
    await expect(video).toBeVisible();
  });

  test('モデル選択のセレクトボックスが表示される', async ({ page }) => {
    const select = page.locator('select');
    await expect(select).toBeVisible();

    // デフォルトでGemma 4 E2Bが選択されている
    const value = await select.inputValue();
    expect(value).toContain('gemma-4');
  });

  test('モデル選択肢が全て存在する', async ({ page }) => {
    const options = page.locator('select option');
    const count = await options.count();
    expect(count).toBe(5);

    // 各モデル名が含まれている
    const texts = await options.allTextContents();
    expect(texts.some((t) => t.includes('Gemma 4'))).toBeTruthy();
    expect(texts.some((t) => t.includes('SmolVLM-256M'))).toBeTruthy();
    expect(texts.some((t) => t.includes('SmolVLM-500M'))).toBeTruthy();
  });

  test('Loadボタンが表示される', async ({ page }) => {
    const loadButton = page.locator('button', { hasText: 'Load' });
    await expect(loadButton).toBeVisible();
  });

  test('撮影ボタンがモデル未読み込み時は無効', async ({ page }) => {
    // 📷ボタン（撮影ボタン）
    const captureButton = page.locator('button', { hasText: '📷' });
    await expect(captureButton).toBeVisible();
    await expect(captureButton).toBeDisabled();
  });

  test('モデル選択を変更できる', async ({ page }) => {
    const select = page.locator('select');

    await select.selectOption({ label: 'SmolVLM-256M' });
    const value = await select.inputValue();
    expect(value).toContain('SmolVLM-256M');
  });
});

test.describe('ドラクエ風メッセージボックス', () => {
  test('初期状態ではメッセージボックスが非表示', async ({ page }) => {
    await page.goto('/');

    // メッセージボックスのスタイル（#0a0a2eの背景）が画面に存在しない
    const messageBox = page.locator('div[style*="0a0a2e"]');
    await expect(messageBox).toHaveCount(0);
  });
});

test.describe('レスポンシブ・モバイル対応', () => {
  test('Pixel 8画面サイズで正常に表示される', async ({ page }) => {
    // Pixel 8: 412 x 915
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/');

    const video = page.locator('video');
    await expect(video).toBeVisible();

    const select = page.locator('select');
    await expect(select).toBeVisible();
  });
});
