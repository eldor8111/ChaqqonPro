from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    BOT_TOKEN: str
    API_URL: str
    PAYMENT_CARD_NUMBER: str = "8600-XXXX-XXXX-XXXX"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
