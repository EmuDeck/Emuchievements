import { SteamAppAchievement } from "./SteamTypes";
import { GameExtendedAchievementEntityWithUserProgress as Achievement, GameInfoAndUserProgress as Game, GetGameInfoAndUserProgressResponse as GameRaw } from "@retroachievements/api";

function getAchievementTitle(achievement: Achievement, showAchievedStatePrefixes: boolean = true) {
	let achievementTitle = '';

	if (!achievement.title) {
		return '';
	}

	if (achievement.dateEarnedHardcore) {
		achievementTitle += "[HARDCORE]";
	}

	if (showAchievedStatePrefixes) {
		if (achievement.dateEarned) {
			achievementTitle += "[ACHIEVED] ";
		} else {
			achievementTitle += "[NOT ACHIEVED] ";
		}
	}

	if (achievement.title.includes("[m]")) {
		achievementTitle += "[MISSABLE] ";
	}

	achievementTitle += achievement.title
		.replace("[m]", "")
		// NOTE: Removes spaces between `[HARDCORE][ACHIEVED] [MISSABLE]`
		.replace(/\]\s\[/g, '][');

	return achievementTitle;
}

function getAchievementImage(achievement: Achievement) {
	const { badgeName } = achievement;

	if (achievement.dateEarned) {
		return `https://media.retroachievements.org/Badge/${badgeName ? badgeName : "0"}.png`
	}

	return `https://media.retroachievements.org/Badge/${badgeName ? badgeName : "0"}_lock.png`
}

export function retroAchievementToSteamAchievement(achievement: Achievement, game: Game, showPrefixes: boolean): SteamAppAchievement
{
	return {
		bAchieved: !!(achievement.dateEarned),
		bHidden: false,
		flAchieved: (((achievement.numAwarded ? achievement.numAwarded : 0) / (game.numDistinctPlayersCasual ? game.numDistinctPlayersCasual : 1)) * 100.0),
		flCurrentProgress: ((achievement.dateEarned)) ? 1 : 0,
		flMaxProgress: 1,
		flMinProgress: 0,
		rtUnlocked: achievement.dateEarnedHardcore ? ((new Date(achievement.dateEarnedHardcore).getTime() / 1000) + (new Date(achievement.dateEarnedHardcore).getTimezoneOffset() * 60)) : achievement.dateEarned ? ((new Date(achievement.dateEarned).getTime() / 1000) + (new Date(achievement.dateEarned).getTimezoneOffset() * 60)) : 0,
		strDescription: (achievement.description) ? achievement.description : "",
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
			: "",
		strImage: getAchievementImage(achievement),
		strName: getAchievementTitle(achievement, showPrefixes),
	};
}

export function rawGameToGame(game: GameRaw): Game
{
	return serializeProperties(game, {
		shouldCastToNumbers: [
			"ID",
			"NumAwarded",
			"NumAwardedHardcore",
			"Points",
			"TrueRatio",
			"DisplayOrder",
			"NumDistinctPlayersCasual",
			"NumDistinctPlayersHardcore",
			"Released"
		]
	});
}

export function serializeProperties<T>(
	originalData: any,
	options: Partial<{
		shouldCastToNumbers: string[];
		shouldMapToBooleans: string[];
	}> = {}
): T
{
	const { shouldCastToNumbers, shouldMapToBooleans } = options;

	let returnValue = originalData;

	if (Array.isArray(originalData))
	{
		const cleanedArray: any[] = [];

		for (const entity of originalData)
		{
			cleanedArray.push(serializeProperties(entity, options));
		}

		returnValue = cleanedArray;
	} else if (!Array.isArray(originalData) && originalData instanceof Object)
	{
		let cleanedObject: Record<string, any> = {};

		for (const [originalKey, originalValue] of Object.entries(originalData))
		{
			let sanitizedValue = originalValue;
			if (shouldCastToNumbers?.includes(originalKey))
			{
				sanitizedValue = originalValue === null ? null : Number(originalValue);
			}

			if (shouldMapToBooleans?.includes(originalKey))
			{
				if (originalValue === null)
				{
					sanitizedValue = null;
				} else
				{
					sanitizedValue = String(originalValue) === "1" ? true : false;
				}
			}

			cleanedObject = {
				...cleanedObject,
				[naiveCamelCase(originalKey)]: serializeProperties(
					sanitizedValue,
					options
				)
			};
		}

		returnValue = cleanedObject;
	}

	return returnValue;
};

const naiveCamelCase = (originalValue: string) =>
{
	// "ID" --> "id", "URL" --> "url"
	if (originalValue.toUpperCase() === originalValue)
	{
		return originalValue.toLowerCase();
	}

	// "GameID" -> "gameID"
	let camelCased =
		originalValue.charAt(0).toLowerCase() + originalValue.slice(1);

	// "gameID" -> "gameId"
	camelCased = camelCased.replaceAll("ID", "Id");

	// "badgeURL" --> "badgeUrl"
	camelCased = camelCased.replaceAll("URL", "Url");

	// "rAPoints" -> "raPoints"
	camelCased = camelCased.replaceAll("rA", "ra");

	// "visibleUserawards" -> "visibleUserAwards"
	camelCased = camelCased.replaceAll("visibleUserawards", "visibleUserAwards");

	return camelCased;
};