import asyncio
import os
from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL")

dp = Dispatcher()

@dp.message(CommandStart())
async def start(message: Message):
    if not WEBAPP_URL:
        await message.answer("Укажите WEBAPP_URL в переменных окружения.")
        return
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Открыть трекер", web_app=WebAppInfo(url=WEBAPP_URL))
    ]])
    await message.answer(
        "Добро пожаловать! Отмечайте выполненные дни и следите за прогрессом челленджа.",
        reply_markup=keyboard,
    )

async def main():
    if not TOKEN:
        raise RuntimeError("Не задан BOT_TOKEN")
    bot = Bot(TOKEN)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
