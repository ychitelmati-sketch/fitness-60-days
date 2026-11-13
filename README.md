# Трекер 60 дней

Telegram Mini App для 60-дневного челленджа: ежедневные отметки, календарь и статистика прогресса.

## Структура
- `frontend/` — React + Vite + TypeScript, интерфейс Telegram Mini App.
- `backend/` — FastAPI + SQLite API.
- `backend/app/bot.py` — Telegram-бот на aiogram 3, который открывает Mini App.
- `.github/workflows/` — проверки backend и публикация frontend на GitHub Pages.

## Локальный запуск

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend API
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API: `http://127.0.0.1:8000`, документация: `http://127.0.0.1:8000/docs`.

### Telegram-бот
Создайте бота через BotFather, задайте `BOT_TOKEN` и `WEBAPP_URL` из `.env.example`, затем:
```bash
python -m app.bot
```

## GitHub Pages
В репозитории откройте **Settings → Pages** и выберите **GitHub Actions** в качестве источника. Workflow собирает только frontend. Адрес сайта будет иметь вид:
`https://ychitelmati-sketch.github.io/fitness-60-days/`

Для Vite base используется путь репозитория. Backend и Telegram-бот на GitHub Pages не запускаются: их нужно отдельно разместить на сервере/платформе с Python. Для production задайте URL API через `VITE_API_URL`.

## Важное о Telegram
В этом стартовом шаблоне frontend использует Telegram WebApp SDK для получения темы и данных интерфейса. Для реальной авторизации на backend обязательно проверяйте подпись `Telegram.WebApp.initData` на сервере по официальному алгоритму Telegram. Не доверяйте переданному клиентом user_id.

## Возможности
- 60-дневный календарь отметок.
- Подсчёт выполненных дней и текущего процента прогресса.
- Сохранение отметок в браузере.
- API для сохранения отметок в SQLite.
- Кнопка запуска Mini App через Telegram-бота.

## Статус
Стартовая версия проекта. Перед публичным запуском настройте серверный API, проверку Telegram initData, HTTPS и резервное копирование базы.
