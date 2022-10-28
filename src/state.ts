import {
    APIState,
    Game,
    GetGameInfoAndUserProgressParams,
    GetUserRecentlyPlayedGamesParams,
    GlobalState
} from "./interfaces";
import {ServerAPI} from "decky-frontend-lib";

export let globalState: GlobalState = {
    current_game: 0
}

export const getData = async (serverAPI: ServerAPI) => {
    let state: APIState = {
        games: [],
        achievements: {},
        loading: true
    };
    let games = await serverAPI.callPluginMethod<GetUserRecentlyPlayedGamesParams, Game[]>("GetUserRecentlyPlayedGames", {
        count: 100
    })
    if (games.success) {
        const achievements: { [key: number]: Game } = {};
        for (const game of games.result) {
            if (game.game_id) {
                const achievement = (await serverAPI.callPluginMethod<GetGameInfoAndUserProgressParams, Game>("GetGameInfoAndUserProgress", {
                    game_id: game.game_id
                }));
                if (achievement.success)
                    achievements[game.game_id] = achievement.result;
            }
        }
        state.games = games.result;
        state.achievements = achievements;
        state.loading = false;
    }
    return state;
}