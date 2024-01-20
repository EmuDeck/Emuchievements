
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
	LocalCoOp = 392,
	RemotePlayTogether = 44,
	HighQualitySoundtrackAudio = 50
}


export interface Achievement
{
	raw: AchievementRaw,
	id?: number,
	game_id?: number,
	game_title?: string,
	game_icon?: string,
	num_awarded?: number,
	num_awarded_hardcore?: number,
	title?: string,
	description?: string,
	points?: number,
	true_ratio?: number,
	author?: string,
	date_modified?: string,
	date_created?: string,
	badge_name?: string,
	display_order?: number,
	mem_addr?: string,
	is_awarded?: boolean,
	date_awarded?: string,
	date_awarded_hardcore?: string,
	hardcore_achieved?: boolean,
	console_name?: string,
}

export interface Game
{
	raw: GameRaw,
	game_id?: number,
	title?: string,
	image_icon?: string,
	console_id?: number,
	console_name?: string,
	forum_topic_id?: number,
	flags?: number,
	image_title?: string,
	image_in_game?: string,
	image_box_art?: string,
	publisher?: string,
	developer?: string,
	genre?: string,
	release_date?: string,
	achievements?: Achievement[],
	is_final?: boolean,
	num_achievements?: number,
	num_distinct_players_casual?: number,
	num_distinct_players_hardcore?: number,
	rich_presence_patch?: string,
	possible_score?: number,
	num_achieved?: number,
	score_achieved?: number,
	num_achieved_hardcore?: number,
	score_achieved_hardcore?: number,
	last_played?: string,
	my_vote?: string,
	completion_percentage?: string,
	completion_percentage_hardcore?: string;
}

export interface AchievementRaw
{
	"ID": number,
	"NumAwarded": string,
	"NumAwardedHardcore": string,
	"Title": string,
	"Description": string,
	"Points": number,
	"TrueRatio": number,
	"Author": string,
	"DateModified": string,
	"DateCreated": string,
	"BadgeName": string,
	"DisplayOrder": number,
	"MemAddr": string,
	"DateEarned": string,
	"DateEarnedHardcore": string,
	"ConsoleName": string,
	"GameIcon": string,
	"GameID": number,
	"GameTitle": string,
	"HardcoreMode": boolean,
	"IsAwarded": boolean;
}

export interface GameRaw
{
	"ID": number,
	"Title": string,
	"ConsoleID": number,
	"ForumTopicID": number,
	"Flags": number,
	"ImageIcon": string,
	"ImageTitle": string,
	"ImageIngame": string,
	"ImageBoxArt": string,
	"Publisher": string,
	"Developer": string,
	"Genre": string,
	"Released": string,
	"IsFinal": number,
	"RichPresencePatch": string,
	"TotalTruePoints": number,
	"GuideURL": string,
	"Created": string,
	"Updated": string,
	"system": {
		"ID": number,
		"Name": string,
		"Created": string,
		"Updated": string;
	},
	"ConsoleName": string,
	"NumDistinctPlayersCasual": number,
	"NumDistinctPlayersHardcore": number,
	"NumAchievements": number,
	"Achievements": Record<number, AchievementRaw>,
	"NumAwardedToUser": number,
	"NumAwardedToUserHardcore": number,
	"UserCompletion": string,
	"UserCompletionHardcore": string,
	"LastPlayed": string,
	"MyVote": string,
	"PossibleScore": number,
	"ScoreAchieved": number,
	"ScoreAchievedHardcore": number;
}

export interface Login
{
	username: string,
	api_key: string;
}

export interface GetUserRecentlyPlayedGamesParams
{
	count: number;
}

export interface GetGameInfoAndUserProgressParams
{
	game_id: number;
}

export interface APIState
{
	games: Game[],
	achievements: { [key: number]: Game; },
	loading: boolean;
}

export interface AchievementsData
{
	game: Game,
	last_updated_at: Date,
	game_id: number,
	md5: string;
}