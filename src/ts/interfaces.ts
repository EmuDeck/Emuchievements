import {GameInfoAndUserProgress} from "@retroachievements/api";

export enum StoreCategory
{
	MultiPlayer = 1,
	SinglePlayer = 2,
	CoOp = 9,
	PartialController = 18,
	MMO = 20,
	Achievements = 22,
	SteamCloud = 23,
	SplitScreen = 24,
	CrossPlatformMultiPlayer = 27,
	FullController = 28,
	TradingCards = 29,
	Workshop = 30,
	VRSupport = 31,
	OnlineMultiPlayer = 36,
	LocalMultiPlayer = 37,
	OnlineCoOp = 38,
	kLocalCoOp = 392,
	RemotePlayTogether = 44,
	HighQualitySoundtrackAudio = 50
}

export interface Login
{
	username: string,
	api_key: string
}

export interface GetUserRecentlyPlayedGamesParams
{
	count: number
}

export interface GetGameInfoAndUserProgressParams
{
	game_id: number
}

export interface APIState
{
	games: GameInfoAndUserProgress[],
	achievements: { [key: number]: GameInfoAndUserProgress },
	loading: boolean
}

export interface AchievementsData
{
	game: GameInfoAndUserProgress,
	last_updated_at: Date,
	game_id?: number,
	md5?: string
}