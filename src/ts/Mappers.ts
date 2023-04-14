import {Achievement, AchievementRaw, Game, GameRaw} from "./interfaces";
import {SteamAppAchievement} from "./SteamTypes";

export const retroAchievementToSteamAchievement = (achievement: Achievement, game: Game): SteamAppAchievement => {
	return {
		bAchieved: !!(achievement.date_awarded),
		bHidden: false,
		flAchieved: (((achievement.num_awarded ? achievement.num_awarded:0) / (game.num_distinct_players_casual ? game.num_distinct_players_casual:1)) * 100.0),
		flCurrentProgress: ((achievement.date_awarded)) ? 1:0,
		flMaxProgress: 1,
		flMinProgress: 0,
		rtUnlocked: achievement.date_awarded_hardcore ? ((new Date(achievement.date_awarded_hardcore).getTime() / 1000) + (new Date(achievement.date_awarded_hardcore).getTimezoneOffset() * 60)) : achievement.date_awarded ? ((new Date(achievement.date_awarded).getTime() / 1000) + (new Date(achievement.date_awarded).getTimezoneOffset() * 60)) : 0,
		strDescription: (achievement.description) ? achievement.description:"",
		strID: (achievement.title) ?
				achievement.title
						.toUpperCase()
						.replace(" ", "_")
						.replace("-", "_")
						.replace("'", "")
						.replace(":", "")
						.replace("\"", "")
						.replace("?", "")
						.replace(".", "")
				:"",
		strImage: `https://media.retroachievements.org/Badge/${!!(achievement.badge_name) ? achievement.badge_name:"0"}.png`,
		strName: (achievement.title) ? ((achievement.date_awarded_hardcore ? "[HARDCORE] ":(achievement.date_awarded ? "[ACHIEVED] ":"[NOT ACHIEVED] ")) + (achievement.title.includes("[m]") ? "[MISSABLE] ":"") + achievement.title.replace("[m]", "")):"",
	}
}

export const rawAchievementToAchievement = (achievement: AchievementRaw): Achievement => {
	const base_url = "https://retroachievements.org"

	return {
		author: achievement.Author,
		badge_name: achievement.BadgeName,
		console_name: achievement.ConsoleName,
		date_awarded: achievement.DateEarned,
		date_awarded_hardcore: achievement.DateEarnedHardcore,
		date_created: achievement.DateCreated,
		date_modified: achievement.DateModified,
		description: achievement.Description,
		display_order: achievement.DisplayOrder,
		game_icon: base_url + achievement.GameIcon,
		game_id: achievement.GameID,
		game_title: achievement.GameTitle,
		hardcore_achieved: achievement.HardcoreMode,
		id: achievement.ID,
		is_awarded: achievement.IsAwarded,
		mem_addr: achievement.MemAddr,
		num_awarded: Number(achievement.NumAwarded),
		num_awarded_hardcore: Number(achievement.NumAwardedHardcore),
		points: achievement.Points,
		raw: achievement,
		title: achievement.Title,
		true_ratio: achievement.TrueRatio
	}
}

export const rawGameToGame = (game: GameRaw): Game => {
	const base_url = "https://retroachievements.org"

	return {
		achievements: Object.values(game.Achievements).map(rawAchievementToAchievement),
		completion_percentage: game.UserCompletion,
		completion_percentage_hardcore: game.UserCompletionHardcore,
		console_id: game.ConsoleID,
		console_name: game.ConsoleName,
		developer: game.Developer,
		flags: game.Flags,
		forum_topic_id: game.ForumTopicID,
		game_id: game.ID,
		genre: game.Genre,
		image_box_art: base_url + game.ImageBoxArt,
		image_icon: base_url + game.ImageIcon,
		image_in_game: base_url + game.ImageIngame,
		image_title: base_url + game.ImageTitle,
		is_final: Boolean(game.IsFinal),
		last_played: game.LastPlayed,
		my_vote: game.MyVote,
		num_achieved: game.NumAwardedToUser,
		num_achieved_hardcore: game.NumAwardedToUserHardcore,
		num_achievements: game.NumAchievements,
		num_distinct_players_casual: game.NumDistinctPlayersCasual,
		num_distinct_players_hardcore: game.NumDistinctPlayersHardcore,
		possible_score: game.PossibleScore,
		publisher: game.Publisher,
		raw: game,
		release_date: game.Released,
		rich_presence_patch: game.RichPresencePatch,
		score_achieved: game.ScoreAchieved,
		score_achieved_hardcore: game.ScoreAchievedHardcore,
		title: game.Title
	}
}