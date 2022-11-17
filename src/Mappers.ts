import {Achievement, Game} from "./interfaces";
import {AppAchievement} from "./SteamClient"

export const retroAchievementToSteamAchievement = (achievement: Achievement, game: Game): AppAchievement => {
	console.log(achievement)
	let steam = {
		bAchieved: !!(achievement.date_awarded),
		bHidden: false,
		flAchieved: (((achievement.num_awarded ? achievement.num_awarded : 0) / (game.num_distinct_players_casual ? game.num_distinct_players_casual : 1)) * 100.0),
		flCurrentProgress: ((achievement.date_awarded)) ? 1 : 0,
		flMaxProgress: 1,
		flMinProgress: 0,
		rtUnlocked: 0,
		strDescription: (achievement.description) ? achievement.description : "",
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
				: "",
		strImage: `https://media.retroachievements.org/Badge/${!!(achievement.badge_name) ? achievement.badge_name : "0"}.png`,
		strName: (achievement.title) ? ((achievement.date_awarded_hardcore ? "[HARDCORE] " : (achievement.date_awarded ? "[ACHIEVED] " : "[NOT ACHIEVED] ")) + (achievement.title.includes("[m]") ? "[MISSABLE] " : "" ) + achievement.title.replace("[m]", "")) : "",
	};
	return steam
}