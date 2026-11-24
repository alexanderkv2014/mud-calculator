# MUD Calculator

Веб-приложение для инженерных расчётов бурового раствора: ВНО, утяжеление, смешивание, LGS/HGS, приготовление.

Приложение работает на Cloudflare Workers:
https://alexanderkv2014-mud-calculator.alexanderkv2014.workers.dev

## Технологии

- TypeScript
- React
- TanStack Start и TanStack Router
- Vite
- Nitro (сборка для Cloudflare Workers)
- Tailwind CSS
- Vitest
- Bun

## Запуск для разработки

```sh
bun install
bun run dev
```

Приложение откроется на http://localhost:8080.

## Команды

```sh
bun run dev          # запуск для разработки
bun run build        # сборка для production (результат в .output)
bun run typecheck    # проверка типов TypeScript
bun run lint         # проверка кода ESLint
bun run test         # тесты Vitest
bun run format       # форматирование кода Prettier
bun run format:check # проверка форматирования
```

## Развёртывание на Cloudflare

```sh
bun run build
bunx wrangler --cwd .output deploy
```

Первая команда собирает проект, вторая публикует Worker `alexanderkv2014-mud-calculator`. Перед первой публикацией Wrangler попросит войти в Cloudflare через браузер.
