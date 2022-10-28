import logging
import os
import sys
from typing import List

sys.path.append(os.path.dirname(__file__))
from retroachievements import RetroAchievements, Game
from settings import SettingsManager

logging.basicConfig(filename="/tmp/emuchievements.log",
                    format='[Emuchievements] %(asctime)s %(levelname)s %(message)s',
                    filemode='w+',
                    force=True)
logger = logging.getLogger()
logger.setLevel(logging.INFO)  # can be changed to logging.DEBUG for debugging issues


class Plugin:
    settings: SettingsManager
    username: str
    api_key: str

    async def Login(self, username: str, api_key: str):
        self.username = username
        self.api_key = api_key
        await self.setSetting(self, "username", username)
        await self.setSetting(self, "api_key", api_key)

    async def isLogin(self) -> bool:
        return (self.username is not None) and (self.api_key is not None)

    async def GetUserRecentlyPlayedGames(self, count: int | None) -> List[Game]:
        client = RetroAchievements(self.username, self.api_key)
        return await client.GetUserRecentlyPlayedGames(self.username, count)

    async def GetGameInfoAndUserProgress(self, game_id: int) -> Game:
        client = RetroAchievements(self.username, self.api_key)
        return await client.GetGameInfoAndUserProgress(self.username, game_id)

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        self.settings = SettingsManager("emuchievements")
        await self.read(self)
        self.username = await self.getSetting(self, "username", None)
        self.api_key = await self.getSetting(self, "api_key", None)
        pass

    async def read(self):
        self.settings.read()

    async def commit(self):
        self.settings.commit()

    async def getSetting(self, key, default):
        return self.settings.getSetting(key, default)

    async def setSetting(self, key, value):
        self.settings.setSetting(key, value)
