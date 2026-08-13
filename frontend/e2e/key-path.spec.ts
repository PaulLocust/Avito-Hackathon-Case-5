import { expect, test, type Page } from '@playwright/test';

// Ключевой пользовательский путь в браузере: регистрация → витрина →
// прохождение сценария → пауза и продолжение → разбор → прогресс.
// Компонентные тесты проверяют экраны на моках, эти — весь стек целиком:
// собранный фронтенд за nginx, бэкенд и PostgreSQL.

/** Уникальный ник: прогоны не должны мешать друг другу. */
function uniqueNickname(prefix: string): string {
  return `${prefix}${Date.now().toString().slice(-9)}`;
}

async function register(page: Page, nickname: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Ник', { exact: true }).fill(nickname);
  await page.getByLabel('Пароль', { exact: true }).fill('e2e-password');
  await page.getByLabel('Пароль ещё раз').fill('e2e-password');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

  await expect(page.getByRole('heading', { name: 'Выберите сценарий' })).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(nickname) })).toBeVisible();
}

/** Открывает первый сценарий витрины и начинает тренировку. */
async function startFirstScenario(page: Page): Promise<void> {
  const firstCard = page.locator('.scenario-card').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Начать тренировку' }).click();

  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/);
  await expect(page.getByRole('button', { name: 'Прервать тренировку' })).toBeVisible();
}

/**
 * Отвечает на текущий шаг первым вариантом и переходит дальше.
 * Варианты — единственные крупные кнопки экрана прохождения.
 * Возвращает true, если этот выбор завершил сценарий.
 */
async function answerCurrentStep(page: Page): Promise<boolean> {
  await page.locator('button.ant-btn-lg').first().click();

  // Разбор после каждого выбора — обязательная часть тренировки (FR15).
  await expect(page.locator('.feedback-card')).toBeVisible();

  // Кнопки antd несут иконку с aria-label, поэтому доступное имя не якорим
  // с начала строки.
  const next = page.getByRole('button', { name: /(Дальше|К результату)$/ });
  const finished = ((await next.textContent()) ?? '').includes('К результату');

  await next.click();

  if (finished) {
    await page.waitForURL(/\/result$/);
  } else {
    await expect(page.locator('.feedback-card')).toHaveCount(0);
  }

  return finished;
}

/** Проходит сценарий до экрана разбора. */
async function playToResult(page: Page): Promise<void> {
  for (let step = 0; step < 12; step += 1) {
    if (await answerCurrentStep(page)) {
      await expect(page.getByText(/Балл: -?\d+ \(от -?\d+ до \d+\)/)).toBeVisible();

      return;
    }
  }

  throw new Error('сценарий не завершился за 12 шагов');
}

test('ключевой путь: регистрация, тренировка, пауза, разбор, прогресс', async ({ page }) => {
  const nickname = uniqueNickname('e2e');

  await register(page, nickname);
  await startFirstScenario(page);

  const sessionUrl = page.url();

  await answerCurrentStep(page);

  // ── Пауза: обещание «можно продолжить» должно выполняться ───────────────
  await page.getByRole('button', { name: 'Прервать тренировку' }).click();

  // Modal.confirm в antd рендерится без role="dialog", поэтому по классу.
  const confirm = page.locator('.ant-modal-confirm');
  await expect(confirm.locator('.ant-modal-confirm-title')).toHaveText('Прервать тренировку?');
  await confirm.getByRole('button', { name: 'Прервать', exact: true }).click();

  await expect(page).toHaveURL(/\/$/);

  const continueCard = page.locator('.continue-card');
  await expect(continueCard).toBeVisible();
  await expect(continueCard.getByText('Продолжить тренировку')).toBeVisible();

  await continueCard.getByRole('button', { name: 'Продолжить' }).click();

  // Возвращаемся в ту же сессию, а не в новую: прогресс не потерян.
  await expect(page).toHaveURL(sessionUrl);
  await expect(page.getByRole('button', { name: 'Прервать тренировку' })).toBeVisible();

  // ── Продолжение до разбора ─────────────────────────────────────────────
  await playToResult(page);

  await expect(page.getByText('Это ваша первая попытка по сценарию.')).toBeVisible();

  // ── Прогресс на главной ────────────────────────────────────────────────
  await page.goto('/');
  await expect(page.getByText(/Пройдено \d+ из \d+ сценариев/)).toBeVisible();
  await expect(page.locator('.continue-card')).toHaveCount(0);
});

test('гость проходит тренировку без регистрации', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Регистрация' })).toBeVisible();

  await startFirstScenario(page);
  await playToResult(page);

  // Статистика — только для авторизованных: гостю показывается витрина.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Выберите сценарий' })).toBeVisible();
  await expect(page.getByText(/Пройдено \d+ из \d+ сценариев/)).toHaveCount(0);
});

test('справочник открывает карточку признака', async ({ page }) => {
  await page.goto('/signals');
  await expect(page.getByRole('heading', { name: 'Справочник признаков риска' })).toBeVisible();

  const firstSignal = page.locator('a[href^="/signals/"]').first();
  const href = await firstSignal.getAttribute('href');
  await firstSignal.click();

  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByText('Как схема работает')).toBeVisible();
  await expect(page.getByText('Как распознать')).toBeVisible();
  await expect(page.getByText('Как действовать')).toBeVisible();
});
