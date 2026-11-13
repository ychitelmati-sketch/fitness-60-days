# FORM60 — трекер 60 дней

Telegram Mini App для 60-дневного челленджа: отметки, календарь, заметки и статистика.

## Архитектура production

- Frontend: React + Vite + TypeScript, Nginx.
- API: FastAPI + SQLAlchemy.
- База: SQLite в постоянном Docker volume `tracker_data`.
- Telegram bot: aiogram 3, отдельный контейнер.
- HTTPS: Caddy автоматически получает и обновляет TLS-сертификат.
- Внешний доступ: только порты 80/443. API и база не публикуются напрямую.

## Требования к VPS

Ubuntu 22.04/24.04, Docker Engine с Compose plugin, домен с A/AAAA-записью на IP VPS. Для Telegram Mini App обязателен HTTPS.

## Развёртывание на VPS

1. Установите Docker Engine и Compose plugin по официальной инструкции Docker.
2. Клонируйте репозиторий на сервер:
   ```bash
   git clone https://github.com/ychitelmati-sketch/fitness-60-days.git
   cd fitness-60-days
   ```
3. Создайте локальный файл окружения:
   ```bash
   cp .env.example .env
   chmod 600 .env
   nano .env
   ```
4. Укажите:
   - `DOMAIN` — ваш домен, направленный на VPS;
   - `BOT_TOKEN` — токен бота из BotFather;
   - `SESSION_SECRET` — случайную строку не короче 32 символов.
5. Запустите:
   ```bash
   docker compose up -d --build
   ```
6. Проверьте:
   ```bash
   docker compose ps
   curl -fsS https://ВАШ-ДОМЕН/health
   ```
7. В BotFather настройте домен Mini App и URL кнопки запуска: `https://ВАШ-ДОМЕН`.

Файл `.env` и база данных не должны попадать в Git. Не отправляйте их содержимое в чаты и не добавляйте в issue.

## Данные и резервные копии

SQLite хранится в именованном Docker volume `tracker_data`, поэтому пересоздание контейнера не удаляет базу. Не выполняйте `docker compose down -v`: ключ `-v` удалит volume с данными.

Резервная копия базы (создаёт файл в текущей директории сервера):
```bash
docker compose exec -T api python -c "import sqlite3; src=sqlite3.connect('/data/tracker.db'); dst=sqlite3.connect('/tmp/tracker-backup.db'); src.backup(dst); dst.close(); src.close()"
docker cp "$(docker compose ps -q api)":/tmp/tracker-backup.db "./tracker-backup-$(date +%F).db"
chmod 600 ./tracker-backup-*.db
```
Храните резервные копии отдельно от публичного web-root и ограничьте к ним доступ.

## Локальная разработка

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Backend:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Синхронизация

Серверная синхронизация включается при открытии приложения внутри Telegram Mini App: сервер проверяет подпись Telegram `initData`, выдаёт сессионный токен и сохраняет состояние пользователя в SQLite. Обычный браузер без Telegram WebApp работает локально в своём браузере и не синхронизируется между устройствами.

## Безопасность

- Не храните реальные секреты в Git.
- Не открывайте порт 8000 наружу; API доступен через HTTPS reverse proxy.
- Используйте только HTTPS URL в BotFather.
- Делайте резервные копии volume `tracker_data`.
- После случайной публикации секрета отзовите его у провайдера и создайте новый.
