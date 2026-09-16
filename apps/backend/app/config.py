import os


class Settings:
    mysql_host: str = os.getenv("MYSQL_HOST", "mysql-server")
    mysql_port: int = int(os.getenv("MYSQL_PORT", "3306"))
    mysql_user: str = os.getenv("MYSQL_USER", "testuser")
    mysql_password: str = os.getenv("MYSQL_PASSWORD", "testpassword")
    mysql_database: str = os.getenv("MYSQL_DATABASE", "testdb")

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
        )


settings = Settings()
