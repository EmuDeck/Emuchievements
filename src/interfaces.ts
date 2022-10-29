import {ServerAPI} from "decky-frontend-lib";

export interface APIProps
{
    serverAPI: ServerAPI
}

export interface LoginProps extends APIProps
{
}

export interface EmuchievementsProps extends APIProps
{
}

export interface HomeProps extends APIProps
{
}

export interface GameProps extends APIProps
{
}

export interface AchievementProps
{
    achievement: Achievement
}

export interface DescriptionProps extends APIProps
{
}

export interface Achievement {
    raw: any,
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

export interface Game {
    raw: any,
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
    completion_percentage_hardcore?: string
}

export interface Login {
    username: string,
    api_key: string
}

export interface GetUserRecentlyPlayedGamesParams {
    count: number
}

export interface GetGameInfoAndUserProgressParams {
    game_id: number
}

export interface APIState {
    games: Game[],
    achievements: { [key: number]: Game },
    loading: boolean
}

export interface LoginState {
    login: boolean
}

export interface GlobalState {
    current_game: number,
    current_achievement: number
}