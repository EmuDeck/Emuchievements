import {AllAchievements, AppDetails, GlobalAchievements, Hook, SteamShortcut} from "./SteamClient";
import {ServerAPI} from "decky-frontend-lib";
import {retroAchievementToSteamAchievement} from "./Mappers";
import localforage from "localforage";
import {AchievementsData, Game, GetGameInfoAndUserProgressParams} from "./interfaces";
import {runInAction} from "mobx";
import Logger from "./logger";
import {EmuchievementsState} from "./hooks/achievementsContext";

localforage.config({
	name: "emuchievements",
	storeName: "achievements"
});

// const romRegex = "(\\/([a-zA-Z\\d-:_.\\s])+)+(?!\\.AppImage)(\\.zip|\\.7z|\\.iso|\\.bin|\\.chd|\\.cue|\\.img|\\.a26|\\.lnx|\\.ngp|\\.ngc|\\.3dsx|\\.3ds|\\.app|\\.axf|\\.cci|\\.cxi|\\.elf|\\.n64|\\.ndd|\\.u1|\\.v64|\\.z64|\\.nds|\\.dmg|\\.gbc|\\.gba|\\.gb|\\.ciso|\\.dol|\\.gcm|\\.gcz|\\.nkit\\.iso|\\.rvz|\\.wad|\\.wia|\\.wbfs|\\.nes|\\.fds|\\.unif|\\.unf|\\.json|\\.kp|\\.nca|\\.nro|\\.nso|\\.nsp|\\.xci|\\.rpx|\\.wud|\\.wux|\\.wua|\\.32x|\\.cdi|\\.gdi|\\.m3u|\\.gg|\\.gen|\\.md|\\.smd|\\.sms|\\.ecm\\|.mds|\\.pbp|\\.dump|\\.gz|\\.mdf|\\.mrg|\\.prx|\\.bs|\\.fig|\\.sfc|\\.smc|\\.swx|\\.pc2|\\.wsc|\\.ws)";
const romRegex = "(\\/([^/\"])+)+(?!\\.AppImage)(\\.zip|\\.7z|\\.iso|\\.bin|\\.chd|\\.cue|\\.img|\\.a26|\\.lnx|\\.ngp|\\.ngc|\\.elf|\\.n64|\\.ndd|\\.u1|\\.v64|\\.z64|\\.nds|\\.dmg|\\.gbc|\\.gba|\\.gb|\\.ciso|\\.nes|\\.fds|\\.unif|\\.unf|\\.32x|\\.cdi|\\.gdi|\\.m3u|\\.gg|\\.gen|\\.md|\\.smd|\\.sms|\\.ecm|\\.mds|\\.pbp|\\.dump|\\.gz|\\.mdf|\\.mrg|\\.prx|\\.bs|\\.fig|\\.sfc|\\.smc|\\.swx|\\.pc2|\\.wsc|\\.ws)";

export class AchievementManager
{
	private emuchievementsState: EmuchievementsState;

	get globalLoading(): boolean {
		return this.emuchievementsState.publicState().loadingData.globalLoading;
	}

	set globalLoading(value: boolean) {
		let state = this.emuchievementsState.publicState().loadingData;
		state.globalLoading = value;
		this.emuchievementsState.setLoadingData(state)
	}

	get processed(): number {
		return this.emuchievementsState.publicState().loadingData.processed;
	}

	set processed(value: number) {
		let state = this.emuchievementsState.publicState().loadingData;
		state.processed = value;
		this.emuchievementsState.setLoadingData(state)
	}

	get total(): number {
		return this.emuchievementsState.publicState().loadingData.total;
	}

	set total(value: number) {
		let state = this.emuchievementsState.publicState().loadingData;
		state.total = value;
		this.emuchievementsState.setLoadingData(state)
	}

	get currentGame(): string {
		return this.emuchievementsState.publicState().loadingData?.currentGame;
	}

	set currentGame(value: string) {
		let state = this.emuchievementsState.publicState().loadingData;
		state.currentGame = value;
		this.emuchievementsState.setLoadingData(state)
	}

	constructor(serverAPI: ServerAPI, emuchievementsState: EmuchievementsState)
	{
		this.serverAPI = serverAPI;
		this.emuchievementsState = emuchievementsState;
	}

	private achievements: { [key: number]: AllAchievements } = {0: {loading: false}};

	private globalAchievements: { [key: number]: GlobalAchievements } = {0: {loading: false}};

	private loading: { [key: number]: boolean } = {0: false};

	private serverAPI: ServerAPI;

	private appDataUnregister: Hook[] = [];

	private logger: Logger = new Logger("AchievementManager");
	private refreshTimer: NodeJS.Timer | null = null;

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
			this.logger.log(`${app_id} cache: `, cache)
			if (cache && !await this.needCacheUpdate(cache.last_updated_at, `${app_id}`))
			{
				resolve(cache);
			} else
			{
				const shortcut = (await SteamClient.Apps.GetAllShortcuts()).find((shortcut: SteamShortcut) => shortcut.appid === app_id)
				this.logger.log(`${app_id} shortcut: `, shortcut)
				if (shortcut && shortcut.data.strExePath)
				{
					const exe = shortcut.data.strExePath
					this.logger.log(`${app_id} exe: `, exe)
					const rom = exe.match(new RegExp(romRegex, "i"))?.[0];
					this.logger.log(`${app_id} rom: `, rom)
					if (rom)
					{
						const md5 = (await this.serverAPI.callPluginMethod<{ path: string }, string>("Hash", {path: rom}));
						this.logger.log(`${app_id} md5: `, md5.result)
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
										this.logger.log(`${app_id} game_id: `, game_id)
										const achievement = (await this.serverAPI.callPluginMethod<GetGameInfoAndUserProgressParams, Game>("GetGameInfoAndUserProgress", {
											game_id
										}));
										this.logger.log(`${app_id} game: `, achievement.result)

										if (achievement.success)
										{
											const result: AchievementsData = {
												game_id: game_id,
												game: achievement.result,
												last_updated_at: new Date()
											}
											await this.updateCache(`${app_id}`, result);
											this.logger.log(`${app_id} result:`, result)
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
		this.globalLoading = true;
		let shortcuts = await SteamClient.Apps.GetAllShortcuts()
		const appDataThrottled = ((data: AppDetails, app_id: number) => {
			if (!!this.achievements[app_id] && !!data)
			{
				const ret = this.achievements[app_id]?.data
				if (!!ret)
				{
					this.logger.log(data, ret)
					runInAction(() => {
						data.achievements.nAchieved = Object.keys(ret.achieved).length;
						data.achievements.nTotal = Object.keys(ret.achieved).length + Object.keys(ret.unachieved).length;
						data.achievements.vecHighlight = [];
						Object.entries(ret.achieved).forEach(([, value]) => {
							data.achievements.vecHighlight.push(value)
						});
						data.achievements.vecUnachieved = [];
						Object.entries(ret.unachieved).forEach(([, value]) => {
							data.achievements.vecUnachieved.push(value)
						});
					});

				}
			}
		});
		this.total = shortcuts.map((shortcut: SteamShortcut) => shortcut.appid).length;
		await Promise.all(shortcuts.map((shortcut: SteamShortcut) => shortcut.appid).map(async (app_id: number) => {
			const overview = appStore.GetAppOverviewByAppID(app_id);
			if (await this.fetchAchievementsAsync(app_id))
			{
				this.logger.log(app_id, this.achievements)
				this.currentGame = overview.display_name ?? "";
				this.processed++;
				this.appDataUnregister.push(appDetailsStore.RegisterForAppData(app_id, (details) => appDataThrottled(details, app_id)));
			} else
			{
				this.currentGame = overview.display_name ?? "";
				this.processed++;
			}
		}));
		this.globalLoading = false;
	}

	async init(): Promise<void>
	{
		await this.refresh_achievements()
		this.refreshTimer = setInterval(async () => {
			await this.refresh_achievements()
		}, 5 * 60 * 1000)
	}

	deinit(): void
	{
		if (this.appDataUnregister.length > 0)
		{
			this.appDataUnregister.forEach(value => value.unregister());
			this.appDataUnregister = [];
		}
		if (this.refreshTimer !== null)
		{
			clearTimeout(this.refreshTimer);
		}
	}

	isReady(steamAppId: number): boolean
	{
		this.logger.log("isReady", steamAppId, this.achievements[steamAppId])
		return !!this.achievements[steamAppId] && !this.achievements[steamAppId].loading;
	}
}