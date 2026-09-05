# Phase 1 — Quality Foundation

Добавлено:

- `typecheck`: строгая проверка TypeScript без сборки.
- `lint`: ESLint.
- `format:check`: проверка форматирования без изменения файлов.
- `test`: Vitest unit tests.
- `.github/workflows/ci.yml`: GitHub Actions pipeline.

## Порядок CI

1. Install dependencies
2. TypeScript type check
3. ESLint
4. Prettier check
5. Unit tests
6. Production build

## Важно

После получения проекта локально выполните `bun install` и закоммитьте обновлённый `bun.lock`. После этого в CI рекомендуется заменить `bun install` на `bun install --frozen-lockfile` для полностью воспроизводимых сборок.

## Следующий шаг

Phase 2: расширение тестового покрытия расчётов, эталонные Golden Tests и property-based tests.
