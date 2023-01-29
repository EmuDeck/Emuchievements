import logging
import os
import ctypes
from settings import SettingsManager
import logging

import aiohttp as aiohttp

from datetime import datetime
from typing import Union, List
import helpers
base_url = "https://retroachievements.org"

logging.basicConfig(
	filename="/tmp/emuchievements.log",
	format='[Emuchievements] %(asctime)s %(levelname)s %(message)s',
	filemode='w+',
	force=True
)
logger = logging.getLogger()
logger.setLevel(logging.INFO)  # can be changed to logging.DEBUG for debugging issues


class RetroachievementsError(Exception):
	pass


class InvalidAuth(RetroachievementsError):
	pass


def full_image_url_or_none(url) -> str | None:  # gets the full image url if the url isn't None
	if url is None:
		return url
	return base_url + url


def bool_or_none(b: bool | str | None) -> bool | None:
	if b is None:
		return b
	if type(b) == str:  # isawarded is a str for some reason
		b = int(b)
	return bool(b)


def percentage_str_to_float(s) -> float | None:
	if s in (None, None):
		return s
	if type(s) == int:  # for some reason it can be an int if it's 0 in GetUserCompletedGames
		return float(s)
	if "%" in s:  # ex: "98.05%", like in GetGameInfoAndUserProgress
		return float(s.strip('%'))
	else:  # ex: "0.5676", like in GetUserCompletedGames
		return round(float(s) * 100, 2)  # we need to round bc weird float behaviour


# else: #this should never be called
# raise ValueError(f"{type(s)}: '{s}' was not supposed to get converted, please report this")


class User(dict):
	def __init__(self,
			   raw,
			   username: str | None = None,
			   points: int | None = None,
			   retro_points: int | None = None,
			   ):
		self.username = username
		self.points = points
		self.retro_points = retro_points

		self.raw = raw  # the raw json
		dict.__init__(self,
				    username=self.username,
				    points=self.points,
				    retro_points=self.retro_points,
				    raw=self.raw
				    )


class Achievement(dict):
	def __init__(self,
			   raw,
			   id: int = None,
			   game_id: int = None,
			   game_title: str = None,
			   game_icon: str = None,
			   num_awarded: int = None,
			   num_awarded_hardcore: int = None,
			   title: str = None,
			   description: str = None,
			   points: int = None,
			   true_ratio: int = None,
			   author: str = None,
			   date_modified: str = None,
			   date_created: str = None,
			   badge_name: str = None,
			   display_order: int = None,
			   mem_addr: str = None,
			   is_awarded: bool = None,
			   date_awarded: str = None,
			   date_awarded_hardcore: str = None,
			   hardcore_achieved: bool = None,
			   console_name: str = None
			   ):
		self.id = id
		self.game_id = game_id
		self.game_title = game_title
		self.game_icon = full_image_url_or_none(game_icon)
		self.num_awarded = num_awarded
		self.num_awarded_hardcore = num_awarded_hardcore
		self.title = title
		self.description = description
		self.points = points
		self.true_ratio = true_ratio
		self.author = author
		self.date_modified = date_modified
		self.date_created = date_created
		self.badge_name = badge_name
		self.display_order = display_order
		self.mem_addr = mem_addr
		self.is_awarded = bool_or_none(is_awarded)
		self.date_awarded = date_awarded
		self.date_awarded_hardcore = date_awarded_hardcore  # should be named DateEarnedHardcore but renamed for
		# consistency
		self.hardcore_achieved = bool_or_none(
			hardcore_achieved)  # for some reason it's often wrong in user summary, so it returns None there
		self.console_name = console_name
		# CumulScore not implemented bc it works wackily and you should use sum() instead

		self.raw = raw
		dict.__init__(self,
				    raw=self.raw,
				    id=self.id,
				    game_id=self.game_id,
				    game_title=self.game_title,
				    game_icon=self.game_icon,
				    num_awarded=self.num_awarded,
				    num_awarded_hardcore=self.num_awarded_hardcore,
				    title=self.title,
				    description=self.description,
				    points=self.points,
				    true_ratio=self.true_ratio,
				    author=self.author,
				    date_modified=self.date_modified,
				    date_created=self.date_created,
				    badge_name=self.badge_name,
				    display_order=self.display_order,
				    mem_addr=self.mem_addr,
				    is_awarded=self.is_awarded,
				    date_awarded=self.date_awarded,
				    date_awarded_hardcore=self.date_awarded_hardcore,
				    hardcore_achieved=self.hardcore_achieved,
				    console_name=self.console_name
				    )


class Game(dict):
	def __init__(self,
			   raw,
			   game_id: int = None,
			   title: str = None,
			   image_icon: str = None,
			   console_id: int = None,
			   console_name: str = None,
			   forum_topic_id: int = None,
			   flags: int = None,
			   image_title: str = None,
			   image_in_game: str = None,
			   image_box_art: str = None,
			   publisher: str = None,
			   developer: str = None,
			   genre: str = None,
			   release_date: str = None,
			   # stuff under is only from extended infos
			   achievements: List[Achievement] = None,
			   is_final: bool = None,
			   num_achievements: int = None,
			   num_distinct_players_casual: int = None,
			   num_distinct_players_hardcore: int = None,
			   rich_presence_patch: str = None,
			   # user infos
			   # num_possible_achievements=None,
			   possible_score: int = None,
			   num_achieved: int = None,
			   score_achieved: int = None,
			   num_achieved_hardcore: int = None,
			   score_achieved_hardcore: int = None,
			   last_played: str = None,
			   my_vote: str = None,
			   completion_percentage: str = None,  # user_completion
			   completion_percentage_hardcore: str = None  # user_completion_hardcore
			   ):
		self.game_id = game_id
		self.title = title
		self.image_icon = full_image_url_or_none(image_icon)
		self.console_id = console_id
		self.console_name = console_name
		self.forum_topic_id = forum_topic_id
		self.flags = flags
		self.image_title = full_image_url_or_none(image_title)
		self.image_in_game = full_image_url_or_none(image_in_game)
		self.image_box_art = full_image_url_or_none(image_box_art)
		self.publisher = publisher
		self.developer = developer
		self.genre = genre
		self.release_date = release_date
		self.achievements = achievements
		self.is_final = is_final
		self.num_achievements = num_achievements
		self.num_distinct_players_casual = num_distinct_players_casual
		self.num_distinct_players_hardcore = num_distinct_players_hardcore
		self.rich_presence_patch = rich_presence_patch

		# self.num_possible_achievements = num_possible_achievements #actually a dupe of num_achievements i think
		self.possible_score = possible_score
		self.num_achieved = num_achieved
		self.score_achieved = score_achieved
		self.num_achieved_hardcore = num_achieved_hardcore
		self.score_achieved_hardcore = score_achieved_hardcore
		self.last_played = last_played
		self.my_vote = my_vote
		self.completion_percentage = percentage_str_to_float(completion_percentage)
		self.completion_percentage_hardcore = percentage_str_to_float(completion_percentage_hardcore)

		self.raw = raw
		dict.__init__(self,
				    game_id=self.game_id,
				    title=self.title,
				    image_icon=self.image_icon,
				    console_id=self.console_id,
				    console_name=self.console_name,
				    forum_topic_id=self.forum_topic_id,
				    flags=self.flags,
				    image_title=self.image_title,
				    image_in_game=self.image_in_game,
				    image_box_art=self.image_box_art,
				    publisher=self.publisher,
				    developer=self.developer,
				    genre=self.genre,
				    release_date=self.release_date,
				    achievements=self.achievements,
				    is_final=self.is_final,
				    num_achievements=self.num_achievements,
				    num_distinct_players_casual=self.num_distinct_players_casual,
				    num_distinct_players_hardcore=self.num_distinct_players_hardcore,
				    rich_presence_patch=self.rich_presence_patch,
				    possible_score=self.possible_score,
				    num_achieved=self.num_achieved,
				    score_achieved=self.score_achieved,
				    num_achieved_hardcore=self.num_achieved_hardcore,
				    score_achieved_hardcore=self.score_achieved_hardcore,
				    last_played=self.last_played,
				    my_vote=self.my_vote,
				    completion_percentage=self.completion_percentage,
				    completion_percentage_hardcore=self.completion_percentage_hardcore,
				    raw=self.raw
				    )


class Activity(dict):
	def __init__(self,
			   id: int | None,
			   username: str | None,
			   activity_type: str | None,
			   data: int | None,
			   data2: int | None,
			   last_update: str | None,
			   timestamp: str | None,
			   raw,
			   ):
		self.id = id
		self.username = username  # called username instead of user to not be mistaken for a RAuser object
		self.activity_type = activity_type
		self.data = data
		self.data2 = data2
		self.last_update = last_update
		self.timestamp = timestamp
		self.raw = raw
		dict.__init__(self,
				    id=self.id,
				    username=self.username,
				    activity_type=self.activity_type,
				    data=self.data,
				    data2=self.data2,
				    last_update=self.last_update,
				    timestamp=self.timestamp,
				    raw=self.raw
				    )


class UserSummary(dict):
	def __init__(self,
			   username: str | None,
			   id: int | None,
			   awarded: List[Game] | None,
			   last_activity: Activity | None,
			   recently_played: List[Game] | None,
			   rich_presence_msg: str | None,
			   member_since: str | None,
			   # last_game_id,
			   last_game: Game | None,
			   contrib_count: int | None,
			   contrib_yield: int | None,
			   total_points: int | None,
			   total_true_points: int | None,
			   permissions: int | None,
			   untracked: str | None,
			   motto: str | None,
			   rank: int | None,
			   total_ranked: int | None,
			   recent_achievements: List[Achievement] | None,
			   user_pic: str | None,
			   status: str | None,
			   raw
			   ):
		self.username = username
		self.id = id
		self.awarded = awarded
		self.last_activity = last_activity
		self.recently_played = recently_played
		self.rich_presence_msg = rich_presence_msg
		self.member_since = member_since
		# self.last_game_id = int_or_none(last_game_id) #useless so removed
		self.last_game = last_game
		self.contrib_count = contrib_count
		self.contrib_yield = contrib_yield
		self.total_points = total_points
		self.total_true_points = total_true_points
		self.permissions = permissions
		self.untracked = untracked
		self.motto = motto
		self.rank = rank
		self.total_ranked = total_ranked
		self.recent_achievements = recent_achievements
		self.user_pic = full_image_url_or_none(user_pic)
		self.status = status
		self.raw = raw
		dict.__init__(self,
				    username=self.username,
				    id=self.id,
				    awarded=self.awarded,
				    last_activity=self.last_activity,
				    recently_played=self.recently_played,
				    rich_presence_msg=self.rich_presence_msg,
				    member_since=self.member_since,
				    last_game=self.last_game,
				    contrib_count=self.contrib_count,
				    contrib_yield=self.contrib_yield,
				    total_points=self.total_points,
				    total_true_points=self.total_true_points,
				    permissions=self.permissions,
				    untracked=self.untracked,
				    motto=self.motto,
				    rank=self.rank,
				    total_ranked=self.total_ranked,
				    recent_achievements=self.recent_achievements,
				    user_pic=self.user_pic,
				    status=self.status,
				    raw=self.raw
				    )


def try_key_or_none(d, k):  # tries to return a key, else returns None
	try:
		return d[k]
	except KeyError:
		return None


# Converters to go from raw JSON to a proper object

def achievement_converter(a) -> Achievement:
	return Achievement(raw=a,
				    id=try_key_or_none(a, "ID") or try_key_or_none(a, "AchievementID"),
				    game_id=try_key_or_none(a, "GameID"),
				    game_title=try_key_or_none(a, "GameTitle"),
				    num_awarded=try_key_or_none(a, "NumAwarded"),
				    num_awarded_hardcore=try_key_or_none(a, "NumAwardedHardcore"),
				    title=try_key_or_none(a, "Title"),
				    game_icon=try_key_or_none(a, "GameIcon"),
				    description=try_key_or_none(a, "Description"),
				    points=try_key_or_none(a, "Points"),
				    true_ratio=try_key_or_none(a, "TrueRatio"),
				    author=try_key_or_none(a, "Author"),
				    date_modified=try_key_or_none(a, "DateModified"),
				    date_created=try_key_or_none(a, "DateCreated"),
				    badge_name=try_key_or_none(a, "BadgeName"),
				    display_order=try_key_or_none(a, "DisplayOrder"),
				    mem_addr=try_key_or_none(a, "MemAddr"),
				    is_awarded=try_key_or_none(a, "IsAwarded"),
				    date_awarded=try_key_or_none(a, "DateAwarded") or try_key_or_none(a,
																		"DateEarned") or try_key_or_none(
					    a, "Date"),
				    date_awarded_hardcore=try_key_or_none(a, "DateEarnedHardcore"),
				    hardcore_achieved=try_key_or_none(a, "HardcoreMode"),
				    console_name=try_key_or_none(a, "ConsoleName"), )


def user_converter(u) -> User:
	return User(raw=u,
			  username=u["1"],
			  points=u["2"],
			  retro_points=u["3"], )


def game_converter(g, game_id: int = None) -> Game:
	if game_id is None:  # we sometime must pass it from the function input instead of from the resp
		game_id = try_key_or_none(g, "ID") or try_key_or_none(g,
												    "GameID")  # Sometimes "GameID" is used instead, in that case just pass the id manually

	try:
		achievement_list = [achievement_converter(g["Achievements"][a]) for a in
						g["Achievements"]]  # converts everything to achivement objects
	except KeyError:
		achievement_list = None

	return Game(raw=g,
			  game_id=game_id,
			  title=try_key_or_none(g, "Title"),
			  forum_topic_id=try_key_or_none(g, "ForumTopicID"),
			  console_id=try_key_or_none(g, "ConsoleID"),
			  console_name=try_key_or_none(g, "ConsoleName"),
			  flags=try_key_or_none(g, "Flags"),
			  image_icon=try_key_or_none(g, "ImageIcon"),
			  image_title=try_key_or_none(g, "ImageTitle"),
			  image_in_game=try_key_or_none(g, "ImageIngame"),
			  image_box_art=try_key_or_none(g, "ImageBoxArt"),
			  publisher=try_key_or_none(g, "Publisher"),
			  developer=try_key_or_none(g, "Developer"),
			  genre=try_key_or_none(g, "Genre"),
			  release_date=try_key_or_none(g, "Released"),
			  # extended infos
			  achievements=achievement_list,
			  is_final=try_key_or_none(g, "IsFinal"),
			  num_achievements=try_key_or_none(g, "NumAchievements") or
						    try_key_or_none(g, "NumPossibleAchievements") or
						    try_key_or_none(g, "MaxPossible"),
			  num_distinct_players_casual=try_key_or_none(g, "NumDistinctPlayersCasual"),
			  num_distinct_players_hardcore=try_key_or_none(g, "NumDistinctPlayersHardcore"),
			  rich_presence_patch=try_key_or_none(g, "RichPresencePatch"),
			  # user infos
			  possible_score=try_key_or_none(g, "PossibleScore"),
			  num_achieved=try_key_or_none(g, "NumAchieved") or try_key_or_none(g,
																   "NumAwardedToUser") or try_key_or_none(
				  g,
				  "NumAwarded"),
			  score_achieved=try_key_or_none(g, "ScoreAchieved"),
			  num_achieved_hardcore=try_key_or_none(g, "NumAchievedHardcore") or try_key_or_none(g,
																				"NumAwardedToUserHardcore") or try_key_or_none(
				  g, "NumAwardedHardcore"),
			  score_achieved_hardcore=try_key_or_none(g, "ScoreAchievedHardcore"),
			  last_played=try_key_or_none(g, "LastPlayed"),
			  my_vote=try_key_or_none(g, "MyVote"),
			  completion_percentage=try_key_or_none(g, "UserCompletion") or try_key_or_none(g, "PctWon"),
			  completion_percentage_hardcore=try_key_or_none(g, "UserCompletionHardcore") or try_key_or_none(g,
																						  "PctWonHardcore"), )


class RetroAchievements:
	api_url = "https://retroachievements.org/API"

	def __init__(self, username, api_key):
		self.username = username
		self.api_key = api_key

	async def request(self, endpoint: str, params: object = {}):
		params |= {"z": self.username, "y": self.api_key}
		async with aiohttp.ClientSession() as session:
			async with session.get(f"{self.api_url}/{endpoint}", params=params,
							   ssl=helpers.get_ssl_context()
							   ) as response:
				if await response.text() == "Invalid API Key":
					# it says "Invalid API Key" if the username is invalid as well
					raise InvalidAuth("Your API key or username is invalid")
				return response

	async def GetTopTenUsers(self) -> list:
		"""Gets the top ten users by points.
		This is the same values as http://retroachievements.org/globalRanking.php?s=5&t=2&f=0
		:return: :class:`list` of 10 :class:`RAuser` objects.
		"""

		r = await (await self.request("API_GetTopTenUsers.php")).json()
		return [user_converter(u) for u in r]  # list of User objects

	async def GetGameInfo(self, game_id: Union[int, str]) -> Game | None:
		"""Gets basic game information
		:param game_id: The ID of the game to fetch
		:return: :class:`game` object with basic infos or :class:`None` if the game isn't found.
		"""
		# GameTitle, Console and GameIcon seem to be dupes of Title, ConsoleName and ImageIcon only present in the basic game infos so they aren't implemented

		r = await (await self.request("API_GetGame.php", {"i": game_id})).json()
		if r["Title"] is None:  # aka game doesn't exist
			return None
		return game_converter(r, game_id=game_id, )

	async def GetGameInfoExtended(self, game_id: Union[int, str]) -> Game | None:
		"""Gets informations on a game
		:param game_id: The ID of the game to fetch
		:return: :class:`game` object or :class:`None` if the game isn't found.
		"""

		r = await (await self.request("API_GetGameExtended.php", {"i": game_id})).json()
		if r["Title"] is None:  # aka game doesn't exist
			return None
		return game_converter(r, game_id=game_id, )

	async def GetConsoleIDs(self) -> list:
		"""Gets a list of the consoles ID and the name associated with them.
		:return: :class:`list` of :class:`dict` objects with an "ID" and a "Name" key
		"""

		r = await (await self.request("API_GetConsoleIDs.php")).json()
		return r

	async def GetGameList(self, console_id: Union[int, str]) -> list:
		"""Gets a list of games on a console
		:param console_id: The ID of the console
		:return: :class:`list` of very trimmed down :class:`game` objects, the list is empty if the console isn't found.
		"""

		r = await (await self.request("API_GetGameList.php", params={"i": console_id})).json()
		# if r == []: #aka console not found
		#     return None

		return [game_converter(g) for g in r]  # list of game objects

	# def GetFeedFor(self, user, count, offset):
	# not implemented bc no matter what I tried, API_GetFeed.php always just returned {"success":false}

	async def GetUserRankAndScore(self, username: str) -> dict:
		"""Gets the score and rank of a user, as well as the total number of ranked users.
		:param username: a string with the username
		:return: :class:`dict` with a "Score", "Rank" and "TotalRanked" key
		If the user doesn't exist, Score will be None and rank will be 1
		"""

		r = await (await self.request("API_GetUserRankAndScore.php", {"u": username})).json()
		r["TotalRanked"] = int(r["TotalRanked"])  # for some reason it's a string
		return r

	async def GetUserProgress(self, username: str, game_ids: List[int]) -> List[Game]:
		"""Gets infos on a game's achivements and score, as well as the progress of a user
		You can fetch infos for multiple games at once
		:param username: a string with the username
		:param game_ids: a list of str or int, each with a game's id
		:return: :class:`list` of :class:`game_user_info` (last_played and my_vote are None)
		If the game doesn't exist, each attribute under user_info will be 0
		"""
		game_ids = [str(g) for g in game_ids]
		game_string = ",".join(game_ids)
		r = await (await self.request("API_GetUserProgress.php", {"u": username, "i": game_string})).json()
		games = []
		for g in r:  # for each games
			games.append(game_converter(r[g], game_id=g))
		return games

	async def GetUserRecentlyPlayedGames(self, username: str, limit: int = None, offset: int = 0) -> List[Game]:
		"""Gets the latest games played by a user
		:param username: a string with the username
		:param limit: how many games to return (the API won't return more than 50 at once)
		:param offset: the offset, this can allow you to see further than the latest 50 games
		:return: :class:`list` of very trimmed down :class:`game` objects with an extra .user_info attribute that contains a :class:`game_user_info` instance.
		The :class:`game` instance has the id, console_id, console_name, title, image_icon and user_info attributes, and the :class:`game_user_info` contains all attributes but num_achieved_hardcore and score_achieved_hardcore (or the raw attribute as it's in the game object)

		(the list will be empty if the user isn't found)
		"""

		r = await (
			await self.request("API_GetUserRecentlyPlayedGames.php",
						    {"u": username, "c": limit, "o": offset})).json()
		return [game_converter(g) for g in r]

	async def GetUserSummary(self, username: str, recent_games_count: int = 5,
						achievement_count: int = 10) -> UserSummary:
		"""Gets the summary of a user
		:param username: a string with the username
		:param recent_games_count: how many recent games to return (the API doesn't seem to have a limit)
		:param achievement_count: how many achivements to return (the API won't return more than 50 at once)
		:return: a :class:`user_summary` instance. The recently_played atttribute is a list of :class:`game`. last_game is a complete game object. awarded is a list of :class:`game` with only achievements informations.
		"""

		r = await (await self.request("API_GetUserSummary.php",
								{"u": username, "g": recent_games_count, "a": achievement_count})).json()

		la = r["LastActivity"]
		last_activity = Activity(id=la["ID"],
							username=la["User"],
							# called username instead of user to not be mistaken for a RAuser object
							activity_type=la["activitytype"],
							data=la["data"],
							data2=la["data2"],
							last_update=la["lastupdate"],
							timestamp=la["timestamp"],
							raw=la, )

		recent_achievements = []
		for g in r["RecentAchievements"]:  # for each game
			for a in r["RecentAchievements"][g]:  # for each achivement in that game
				recent_achievements.append(achievement_converter(r["RecentAchievements"][g][a]))
		return UserSummary(username=username,
					    id=r["ID"],
					    awarded=[game_converter(r['Awarded'][g], game_id=g) for g in r['Awarded']],
					    last_activity=last_activity,
					    recently_played=[game_converter(g) for g in r["RecentlyPlayed"]],  # list of dicts
					    rich_presence_msg=r["RichPresenceMsg"],
					    member_since=r["MemberSince"],
					    # last_game_id=r["LastGameID"],
					    last_game=game_converter(r["LastGame"]),
					    contrib_count=r["ContribCount"],
					    contrib_yield=r["ContribYield"],
					    total_points=r["TotalPoints"],
					    total_true_points=r["TotalTruePoints"],
					    permissions=r["Permissions"],
					    untracked=r["Untracked"],
					    motto=r["Motto"],
					    rank=r["Rank"],
					    total_ranked=r["TotalRanked"],
					    recent_achievements=recent_achievements,
					    user_pic=r["UserPic"],
					    status=r["Status"],
					    raw=r, )

	async def GetUserGamesCompleted(self, username: str) -> list:
		"""Gets the completed games of a user
		:param username: a string with the username
		:return: a :class:`list` of :class:`game` with the % of completion, sorted by reverse % of completion
		"""

		r = await (await self.request("API_GetUserCompletedGames.php", {"u": username})).json()
		# hardcore and non-hardcore counts as separate, so we need to "fuse" them in a single game
		# god forgive me for this unoptimized code
		games_list = []
		while True:
			try:
				d = r.pop(0)  # get the first dict and remove it
				for i in r:  # we check every other dict to see if one has the same game_id
					if d["GameID"] == i["GameID"]:  # we did find another game with this id
						if int(i["HardcoreMode"]) == 1:  # i is the hardcore mode
							d["PctWonHardcore"] = i["PctWon"]
							d["NumAwardedHardcore"] = i["NumAwarded"]
							games_list.append(d)
							r.remove(i)  # no need to iterate anymore
							break
						else:  # d is the hardcore mode
							i["PctWonHardcore"] = d["PctWon"]
							i["NumAwardedHardcore"] = d["NumAwarded"]
							games_list.append(i)
							r.remove(i)  # we popped d already, but i is still in the list, so we remove him
							break
				else:  # didn't fibd a hardcore mode (aka no break)
					d["PctWonHardcore"] = 0
					d["NumAwardedHardcore"] = 0
					games_list.append(d)

			except IndexError:  # we went over the whole list
				break

		return [game_converter(g) for g in games_list]  # we convert into actual games

	async def GetGameInfoAndUserProgress(self, username: str, game_id: int | str) -> Game:
		"""Gets a game's info as well as the progress of a user on that game
		:param username: a string with the username
		:param game_id: the game's id
		:return: a :class:`game` instance.
		"""

		r = await (await self.request("API_GetGameInfoAndUserProgress.php", {"u": username, "g": game_id})).json()
		return game_converter(r)

	async def GetAchievementsEarnedOnDay(self, username: str, date: datetime) -> list:
		"""Gets achievements earned by a user on a specific day
		:param username: a string with the username
		:param date: a datetime object of the day to fetch (time doesn't matter).
		:return: a :class:`list` of :class:`achievement` instance.
		"""

		r = await (await self.request("API_GetAchievementsEarnedOnDay.php",
								{"u": username, "d": date.strftime('%Y-%m-%d')})).json()
		return [achievement_converter(a) for a in r]


class Plugin:
	settings: SettingsManager
	username: str
	api_key: str
	client: RetroAchievements
	hidden: bool = False

	async def Hash(self, path: str, plugin: str = "Emuchievements") -> str:
		# lib = ctypes.CDLL(f"{helpers.get_homebrew_path(helpers.get_home_path(helpers.get_user()))}/plugins/{plugin}/bin/Emuchievements.so")
		# hash = lib.hash
		# hash.argtypes = [ctypes.c_char_p]
		# hash.restype = ctypes.c_char_p
		# return hash(path.encode('utf-8'))

		return os.popen(f"'{helpers.get_homebrew_path(helpers.get_home_path(helpers.get_user()))}/plugins/{plugin}/bin/Emuchievements' \"{path}\"").read().strip()

	async def Login(self, username: str, api_key: str):
		Plugin.username = username
		Plugin.api_key = api_key
		Plugin.client = RetroAchievements(Plugin.username, Plugin.api_key)
		await Plugin.commit(self)

	async def isLogin(self) -> bool:
		return (Plugin.username != "") and (Plugin.api_key != "")

	async def Hidden(self, hidden: bool):
		Plugin.hidden = hidden
		await Plugin.commit(self)

	async def isHidden(self) -> bool:
		return Plugin.hidden

	async def GetUserRecentlyPlayedGames(self, count: int | None) -> List[Game]:
		return await Plugin.client.GetUserRecentlyPlayedGames(Plugin.username, count)

	async def GetGameInfoAndUserProgress(self, game_id: int) -> Game:
		return await Plugin.client.GetGameInfoAndUserProgress(Plugin.username, game_id)

	# Asyncio-compatible long-running code, executed in a task when the plugin is loaded
	async def _main(self):
		Plugin.settings = SettingsManager("emuchievements")
		await Plugin.read(self)
		logger.info(f"{Plugin.username} -> {Plugin.api_key}")
		Plugin.client = RetroAchievements(Plugin.username, Plugin.api_key)

	async def _unload(self):
		await Plugin.commit(self)

	async def read(self):
		Plugin.settings.read()
		Plugin.username = await Plugin.waitForSetting(self, "username")
		Plugin.api_key = await Plugin.waitForSetting(self, "api_key")
		Plugin.hidden = await Plugin.getSetting(self, "hidden", False)

	async def commit(self):
		await Plugin.setSetting(self, "username", Plugin.username)
		await Plugin.setSetting(self, "api_key", Plugin.api_key)
		await Plugin.setSetting(self, "hidden", Plugin.hidden)
		Plugin.settings.commit()

	async def getSetting(self, key, default):
		Plugin.settings.read()
		return Plugin.settings.getSetting(key, default)

	async def waitForSetting(self, key):
		setting = await Plugin.getSetting(self, key, "")
		retries = 50
		while setting == "" and retries >= 0:
			setting = await Plugin.getSetting(self, key, "")
			retries -= 1
		return setting

	async def setSetting(self, key, value):
		Plugin.settings.setSetting(key, value)
		await Plugin.read(self)
