import { expect, test } from '@playwright/test'

test.describe('fluxo de compra', () => {
  test('cliente compra assento com Pix e chega no ingresso', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('option', { name: /Bruno Cliente/i }).click()
    await page.getByLabel('Senha').fill('cineray')
    await page.locator('form button[type="submit"]').click()

    await expect(page).toHaveURL(/\/conta|\/$/, { timeout: 30_000 })

    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: /Em cartaz|Todos os filmes|Resultados|CineRay/i }).first(),
    ).toBeVisible({ timeout: 30_000 })

    const movieLink = page.locator('a[href^="/filme/"]').first()
    await expect(movieLink).toBeVisible({ timeout: 30_000 })
    await movieLink.click()

    await expect(page.getByRole('heading', { name: 'Sessões' })).toBeVisible()
    const sessionLink = page.locator('a[href*="/seats/"]').first()
    await expect(sessionLink).toBeVisible({ timeout: 30_000 })
    await sessionLink.click()

    await expect(page.locator('button.seat').first()).toBeVisible({ timeout: 30_000 })

    const availableSeat = page.locator('button.seat:not([disabled])').first()
    await expect(availableSeat).toBeVisible({ timeout: 30_000 })
    await availableSeat.click()

    await page.getByRole('button', { name: /Ir para o pagamento/i }).click()
    await expect(page).toHaveURL(/\/checkout/)

    await page.locator('label').filter({ hasText: 'Pix / QR Code' }).click()
    await page.getByRole('button', { name: 'Liberar QR Code Pix' }).click()
    await page.getByRole('button', { name: /Já paguei\. Gerar ingresso/i }).click()

    await expect(page).toHaveURL(/\/success/, { timeout: 60_000 })
    await expect(page.getByText(/ingresso|QR/i).first()).toBeVisible()
  })
})
