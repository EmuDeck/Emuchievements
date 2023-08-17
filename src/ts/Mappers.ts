import {SteamAppAchievement} from "./SteamTypes";
import {GameExtended, GameExtendedAchievementEntityWithUserProgress as Achievement} from "@retroachievements/api";

export const retroAchievementToSteamAchievement = (achievement: Achievement, game: GameExtended): SteamAppAchievement => {
	return {
		bAchieved: !!(achievement.dateEarned),
		bHidden: false,
		flAchieved: (((achievement.numAwarded ? achievement.numAwarded:0) / (game.numDistinctPlayersCasual ? game.numDistinctPlayersCasual:1)) * 100.0),
		flCurrentProgress: ((achievement.dateEarned)) ? 1:0,
		flMaxProgress: 1,
		flMinProgress: 0,
		rtUnlocked: achievement.dateEarnedHardcore ? ((new Date(achievement.dateEarnedHardcore).getTime() / 1000) + (new Date(achievement.dateEarnedHardcore).getTimezoneOffset() * 60)) : achievement.dateEarned ? ((new Date(achievement.dateEarned).getTime() / 1000) + (new Date(achievement.dateEarned).getTimezoneOffset() * 60)) : 0,
		strDescription: (achievement.description) ? achievement.description:"",
		strID: (achievement.title) ?
				achievement.title
						.toUpperCase()
						.replace(" ", "")
						.replace("-", "")
						.replace("'", "")
						.replace(":", "")
						.replace("\"", "")
						.replace("?", "")
						.replace(".", "")
				:"",
		strImage: `https://media.retroachievements.org/Badge/${!!(achievement.badgeName) ? achievement.badgeName:"0"}.png`,
		strName: (achievement.title) ? ((achievement.dateEarnedHardcore ? "[HARDCORE] ":(achievement.dateEarned ? "[ACHIEVED] ":"[NOT ACHIEVED] ")) + (achievement.title.includes("[m]") ? "[MISSABLE] ":"") + achievement.title.replace("[m]", "")):"",
	}
}