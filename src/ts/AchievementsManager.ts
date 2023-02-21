import {ServerAPI} from "decky-frontend-lib";
import {retroAchievementToSteamAchievement} from "./Mappers";
import localforage from "localforage";
import {AchievementsData, Game, GetGameInfoAndUserProgressParams} from "./interfaces";
import {runInAction} from "mobx";
import Logger from "./logger";
import {EmuchievementsState} from "./hooks/achievementsContext";
import {
	getAllNonSteamAppOverview,
	getAppDetails,
	hideApp,
	showApp
} from "./steam-utils";
import {AllAchievements, GlobalAchievements, SteamAppDetails} from "./SteamTypes";
import {Promise} from "bluebird";
localforage.config({
	name: "emuchievements",
	storeName: "achievements"
});

// const romRegex = "(\\/([a-zA-Z\\d-:_.\\s])+)+(?!\\.AppImage)(\\.zip|\\.7z|\\.iso|\\.bin|\\.chd|\\.cue|\\.img|\\.a26|\\.lnx|\\.ngp|\\.ngc|\\.3dsx|\\.3ds|\\.app|\\.axf|\\.cci|\\.cxi|\\.elf|\\.n64|\\.ndd|\\.u1|\\.v64|\\.z64|\\.nds|\\.dmg|\\.gbc|\\.gba|\\.gb|\\.ciso|\\.dol|\\.gcm|\\.gcz|\\.nkit\\.iso|\\.rvz|\\.wad|\\.wia|\\.wbfs|\\.nes|\\.fds|\\.unif|\\.unf|\\.json|\\.kp|\\.nca|\\.nro|\\.nso|\\.nsp|\\.xci|\\.rpx|\\.wud|\\.wux|\\.wua|\\.32x|\\.cdi|\\.gdi|\\.m3u|\\.gg|\\.gen|\\.md|\\.smd|\\.sms|\\.ecm\\|.mds|\\.pbp|\\.dump|\\.gz|\\.mdf|\\.mrg|\\.prx|\\.bs|\\.fig|\\.sfc|\\.smc|\\.swx|\\.pc2|\\.wsc|\\.ws)";
const romRegex = "(\\/([^/\"])+)+(?!\\.AppImage)(\\.zip|\\.7z|\\.iso|\\.bin|\\.chd|\\.cue|\\.img|\\.a26|\\.lnx|\\.ngp|\\.ngc|\\.elf|\\.n64|\\.ndd|\\.u1|\\.v64|\\.z64|\\.nds|\\.dmg|\\.gbc|\\.gba|\\.gb|\\.ciso|\\.nes|\\.fds|\\.unif|\\.unf|\\.32x|\\.cdi|\\.gdi|\\.m3u|\\.gg|\\.gen|\\.md|\\.smd|\\.sms|\\.ecm|\\.mds|\\.pbp|\\.dump|\\.gz|\\.mdf|\\.mrg|\\.prx|\\.bs|\\.fig|\\.sfc|\\.smc|\\.swx|\\.pc2|\\.wsc|\\.ws)";


export interface Manager
{
	state: EmuchievementsState,
	init(): Promise<void>,
	deinit(): Promise<void>,
	refresh(): Promise<void>
}

export interface AchievementsProgress
{
	achieved: number,
	total: number,
	percentage: number
}

export class AchievementManager implements Manager
{
	private _state: EmuchievementsState | undefined;

	get state(): EmuchievementsState
	{
		return this._state!;
	}

	set state(value: EmuchievementsState)
	{
		this._state = value;
	}

	get globalLoading(): boolean
	{
		return this.state.loadingData.globalLoading;
	}

	set globalLoading(value: boolean)
	{
		let state = this.state.loadingData;
		state.globalLoading = value;
		this.state.loadingData = state;
	}

	get processed(): number
	{
		return this.state.loadingData.processed;
	}

	set processed(value: number)
	{
		let state = this.state.loadingData;
		state.processed = value;
		this.state.loadingData = state;
	}

	get total(): number
	{
		return this.state.loadingData.total;
	}

	set total(value: number)
	{
		let state = this.state.loadingData;
		state.total = value;
		this.state.loadingData = state;
	}

	get currentGame(): string
	{
		return this.state.loadingData?.currentGame;
	}

	set currentGame(value: string)
	{
		let state = this.state.loadingData;
		state.currentGame = value;
		this.state.loadingData = state
	}

	get serverAPI(): ServerAPI {
		return this.state.serverAPI;
	}

	constructor(state: EmuchievementsState)
	{
		this.state = state;
	}

	private achievements: { [key: number]: AllAchievements } = {0: {loading: false}};

	private globalAchievements: { [key: number]: GlobalAchievements } = {0: {loading: false}};

	private loading: { [key: number]: boolean } = {0: false};

	private logger: Logger = new Logger("AchievementManager");

	public async updateCache(appId: string, newData: AchievementsData)
	{
		await localforage.setItem(appId, newData);
	};

	public clearCache()
	{
		localforage.clear();
	};

	public async getCache(appId: string): Promise<AchievementsData | null>
	{
		return await localforage.getItem<AchievementsData>(appId);
	};

	public async needCacheUpdate(lastUpdatedAt: Date, appId: string)
	{
		const now = new Date();
		const durationMs = Math.abs(lastUpdatedAt.getTime() - now.getTime());

		const minutesBetweenDates = durationMs / (60 * 1000);
		return minutesBetweenDates > 4 || await this.getCache(appId) === null;
	};

	public async getAchievementsForGame(app_id: number): Promise<AchievementsData | undefined>
	{
		return new Promise<AchievementsData | undefined>(async (resolve, reject) => {
			const cache = await this.getCache(`${app_id}`);
			this.logger.debug(`${app_id} cache: `, cache)
			if (cache && !await this.needCacheUpdate(cache.last_updated_at, `${app_id}`))
			{
				resolve(cache);
			} else
			{
				const shortcut = await getAppDetails(app_id)
				this.logger.debug(`${app_id} shortcut: `, shortcut)
				if (shortcut && shortcut.strShortcutExe)
				{
					const exe = shortcut.strShortcutExe
					this.logger.debug(`${app_id} exe: `, exe)
					const rom = exe.match(new RegExp(romRegex, "i"))?.[0];
					this.logger.debug(`${app_id} rom: `, rom)
					if (rom)
					{
						const md5 = (await this.serverAPI.callPluginMethod<{ path: string }, string>("Hash", {path: rom}));
						this.logger.debug(`${app_id} md5: `, md5.result)
						if (md5.success)
						{
							const response = (await this.serverAPI.fetchNoCors<{ body: string; status: number }>(`https://retroachievements.org/dorequest.php?r=gameid&m=${md5.result}`, {
								method: "GET"
							}))
							if (response.success)
							{
								if (response.result.status == 200)
								{
									const game_id: number = (JSON.parse(response.result.body) as { "Success": boolean, "GameID": number }).GameID;
									if (game_id !== 0)
									{
										this.logger.debug(`${app_id} game_id: `, game_id)
										const achievement = (await this.serverAPI.callPluginMethod<GetGameInfoAndUserProgressParams, Game>("GetGameInfoAndUserProgress", {
											game_id
										}));
										this.logger.debug(`${app_id} game: `, achievement.result)

										if (achievement.success)
										{
											const result: AchievementsData = {
												game_id: game_id,
												game: achievement.result,
												last_updated_at: new Date()
											}
											await this.updateCache(`${app_id}`, result);
											this.logger.debug(`${app_id} result:`, result)
											resolve(result);
										} else reject(new Error(achievement.result));
									} else resolve(undefined);
								} else reject(new Error(`http error code: ${response.result.status}`));
							} else reject(new Error(response.result));
						} else reject(new Error(md5.result));
					} else resolve(undefined);
				} else reject(new Error(`${app_id}: ${shortcut}`));
			}
		});
	}

	fetchAchievements(app_id: number): { all: AllAchievements, global: GlobalAchievements }
	{
		if (((this.loading)[app_id] == undefined) ? (this.loading)[0] : (this.loading)[app_id])
		{
			return {
				all: {
					loading: true
				},
				global: {
					loading: true
				}
			}
		} else if (!((((this.achievements)[app_id] === undefined) ? (this.achievements)[0] : (this.achievements)[app_id]).data))
		{
			(this.loading)[app_id] = true;
			this.getAchievementsForGame(app_id).then((retro: AchievementsData | undefined): { all: AllAchievements, global: GlobalAchievements } => {
				let achievements: AllAchievements = {
					data: {
						achieved: {},
						hidden: {},
						unachieved: {}
					},
					loading: false
				}
				let globalAchievements: GlobalAchievements = {
					data: {},
					loading: false
				}
				if (retro && retro.game.achievements)
				{
					retro.game.achievements.forEach(achievement => {
						let steam = retroAchievementToSteamAchievement(achievement, retro.game);
						if (achievements.data && globalAchievements.data)
						{
							if (steam.bAchieved)
								achievements.data.achieved[steam.strID] = steam
							else
								achievements.data.unachieved[steam.strID] = steam

							globalAchievements.data[steam.strID] = (((achievement.num_awarded ? achievement.num_awarded : 0) / (retro.game.num_distinct_players_casual ? retro.game.num_distinct_players_casual : 1)) * 100.0)
						}
					})
					return {
						all: achievements,
						global: globalAchievements
					};
				} else
					return {
						all: {
							loading: true,
						},
						global: {
							loading: true,
						}
					}
			}).then(value => {
				(this.achievements)[app_id] = value.all;
				(this.globalAchievements)[app_id] = value.global;
				(this.loading)[app_id] = false;
			});
			return {
				all: {
					loading: true,
				},
				global: {
					loading: true,
				}
			}
		} else
		{
			return {
				all: (this.achievements)[app_id],
				global: (this.globalAchievements)[app_id]
			}
		}
	}

	fetchAchievementsProgress(app_id: number): AchievementsProgress | undefined
	{
		const achievements = this.fetchAchievements(app_id).all.data;
		// If there are achievements, render them in a progress bar.
		if (!!achievements)
		{
			const achieved = Object.keys(achievements.achieved).length;
			const total = Object.keys(achievements.achieved).length + Object.keys(achievements.unachieved).length;
			return {
                    achieved,
                    total,
				percentage: (achieved / total) * 100
               }
		}
		return
	}

	async fetchAchievementsAsync(app_id: number): Promise<{ all: AllAchievements, global: GlobalAchievements } | undefined>
	{
		return new Promise<{ all: AllAchievements, global: GlobalAchievements } | undefined>(async (resolve) => {
			if (!((((this.achievements)[app_id] === undefined) ? (this.achievements)[0] : (this.achievements)[app_id]).data))
			{
				(this.loading)[app_id] = true;
				resolve(await this.getAchievementsForGame(app_id).then((retro: AchievementsData | undefined): { all: AllAchievements, global: GlobalAchievements } | undefined => {
					let achievements: AllAchievements = {
						data: {
							achieved: {},
							hidden: {},
							unachieved: {}
						},
						loading: false
					}
					let globalAchievements: GlobalAchievements = {
						data: {},
						loading: false
					}
					if (retro && retro.game.achievements)
					{
						retro.game.achievements.forEach(achievement => {
							let steam = retroAchievementToSteamAchievement(achievement, retro.game);
							if (achievements.data && globalAchievements.data)
							{
								if (steam.bAchieved)
									achievements.data.achieved[steam.strID] = steam
								else
									achievements.data.unachieved[steam.strID] = steam

								globalAchievements.data[steam.strID] = (((achievement.num_awarded ? achievement.num_awarded : 0) / (retro.game.num_distinct_players_casual ? retro.game.num_distinct_players_casual : 1)) * 100.0)
							}
						})
						return {
							all: achievements,
							global: globalAchievements
						};
					} else
						return undefined
				}).then(value => {
					if (value)
					{
						(this.achievements)[app_id] = value.all;
						(this.globalAchievements)[app_id] = value.global;
					}
					(this.loading)[app_id] = false;

					return value;
				}));
			} else
			{
				resolve({
					all: (this.achievements)[app_id],
					global: (this.globalAchievements)[app_id]
				});
			}
		});
	}

	async refresh_achievements(): Promise<void>
	{
		await this.refresh_achievements_for_apps((await getAllNonSteamAppOverview()).map((shortcut) => shortcut.appid))
	}

	async refresh_achievements_for_apps(app_ids: number[]): Promise<void>
	{
		this.globalLoading = true;
		this.total = app_ids.length;
		this.processed = 0;
		await Promise.map(app_ids, (async (app_id) => await this.refresh_achievements_for_app(app_id)));
		this.globalLoading = false;
	}

	private async refresh_achievements_for_app(app_id: number): Promise<void>
	{
		this.logger.debug(app_id)
		const overview = appStore.GetAppOverviewByAppID(app_id);

		const details = await getAppDetails(app_id)
		if (details)
		{
			const numberOfAchievements = await this.set_achievements_for_details(app_id, details)
			this.currentGame = `${(`${overview.display_name} ` ?? "")}: ${numberOfAchievements !== 0 ? `loaded ${numberOfAchievements}` : "no achievements found"}`;
			this.processed++;
		}
		else
		{
			this.currentGame = `${(`${overview.display_name} ` ?? "")}: no achievements found`;
			this.processed++;
		}
	}

	async set_achievements_for_details(app_id: number, details: SteamAppDetails): Promise<number>
	{
		let numberOfAchievements = 0;
		if (await this.fetchAchievementsAsync(app_id))
		{
			this.logger.debug(app_id, this.achievements)

			if (details)
			{
				if (!!this.achievements[app_id] && !!details)
				{
					const ret = this.achievements[app_id]?.data
					if (!!ret)
					{
						this.logger.debug(details, ret)
						runInAction(() => {
							details.achievements.nAchieved = Object.keys(ret.achieved).length;
							numberOfAchievements = Object.keys(ret.achieved).length + Object.keys(ret.unachieved).length;
							details.achievements.nTotal = numberOfAchievements
							details.achievements.vecHighlight = [];
							Object.entries(ret.achieved).forEach(([, value]) => {
								details.achievements.vecHighlight.push(value)
							});
							details.achievements.vecUnachieved = [];
							Object.entries(ret.unachieved).forEach(([, value]) => {
								details.achievements.vecUnachieved.push(value)
							});
						});

					}
				}
			}

		}
		return numberOfAchievements
	}

	async refresh_shortcuts(): Promise<void>
	{
		const shortcuts = await getAllNonSteamAppOverview()
		const hidden = await this.serverAPI.callPluginMethod<{}, boolean>("isHidden", {})
		this.logger.debug("hidden: ", hidden)
		let app_ids: number[] = shortcuts.map(shortcut => shortcut.appid).filter(this.isReady);
		for (const app_id of app_ids)
		{
			await showApp(app_id);
		}
		if (hidden.success)
		{
			if (hidden.result)
			{
				for (const app_id of app_ids)
				{
					await hideApp(app_id);
				}
			} else
			{
				for (const app_id of app_ids)
				{
					await showApp(app_id);
				}
			}
		}
	}

	async refresh(): Promise<void>
	{
		await this.refresh_achievements();
		await this.refresh_shortcuts();
	}

	async init(): Promise<void>
	{
		await this.refresh();
	}

	async deinit(): Promise<void>
	{
	}

	isReady(steamAppId: number): boolean
	{
		this.logger.debug("isReady", steamAppId, this.achievements[steamAppId])
		return !!this.achievements[steamAppId] && !this.achievements[steamAppId].loading;
	}
}