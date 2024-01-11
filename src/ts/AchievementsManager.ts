import {ServerAPI, sleep} from "decky-frontend-lib";
import {rawGameToGame, retroAchievementToSteamAchievement} from "./Mappers";
import {AchievementsData, GameRaw} from "./interfaces";
import Logger from "./logger";
import {EmuchievementsState} from "./hooks/achievementsContext";
import {getAllNonSteamAppIds, getAllNonSteamAppOverview, getAppDetails, hideApp, showApp} from "./steam-utils";
import {
	AllAchievements,
	GlobalAchievements
} from "./SteamTypes";
import {Promise} from "bluebird";
import {runInAction} from "mobx";
import {format, getTranslateFunc} from "./useTranslations";
import throttledQueue from "throttled-queue";
import {CacheData} from "./settings";

// localforage.config({
// 	name: "emuchievements",
// 	storeName: "achievements"
// });

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
	percentage: number,
	data: AchievementsData
}

export class AchievementManager implements Manager
{
	private t = getTranslateFunc()

	private _state: EmuchievementsState;

	get state(): EmuchievementsState
	{
		return this._state;
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
		this.state.loadingData.globalLoading = value;
	}

	get processed(): number
	{
		return this.state.loadingData.processed;
	}

	set processed(value: number)
	{
		this.state.loadingData.processed = value;
	}

	get total(): number
	{
		return this.state.loadingData.total;
	}

	set total(value: number)
	{
		this.state.loadingData.total = value;
	}

	get game(): string
	{
		return this.state.loadingData.game;
	}

	set game(value: string)
	{
		this.state.loadingData.game = value;
	}

	get description(): string
	{
		return this.state.loadingData.description;
	}

	set description(value: string)
	{
		this.state.loadingData.description = value;
	}

	get fetching(): boolean
	{
		return this.state.loadingData.fetching;
	}

	set fetching(value: boolean)
	{
		this.state.loadingData.fetching = value;
	}

	get serverAPI(): ServerAPI
	{
		return this.state.serverAPI;
	}

	async checkOnlineStatus()
	{
		try
		{
			const online = await this.serverAPI.fetchNoCors<{ body: string; status: number }>("https://example.org");
			this.logger.debug(online)
			return online.success && online.result.status >= 200 && online.result.status < 300; // either true or false
		} catch (err)
		{
			return false; // definitely offline
		}
	}

	async waitForOnline()
	{
		while (!(await this.checkOnlineStatus()))
		{
			this.logger.debug("No internet connection, retrying...");
			await sleep(1000);
		}
	}

	constructor(state: EmuchievementsState)
	{
		this._state = state;
	}

	private cache: CacheData = {
		hashes: {},
		ids: {}
	}

	private get hashes() {
		return this.cache.hashes
	}

	private set hashes(value: Record<string, number>) {
		this.cache.hashes = value;
	}

	private get ids() {
		return this.cache.ids
	}

	private set ids(value: Record<number, number | null>) {
		this.cache.ids = value;
	}

	private achievements: Record<number, AchievementsData> = {};

	private allAchievements: Record<number, AllAchievements> = {0: {loading: false}};

	private globalAchievements: Record<number, GlobalAchievements> = {0: {loading: false}};

	private loading: Record<number, boolean> = {0: false};

	private logger: Logger = new Logger("AchievementManager");

	public clearRuntimeCache()
	{
		this.allAchievements = {0: {loading: false}};
		this.globalAchievements = {0: {loading: false}};
		this.loading = {0: false};
		this.achievements = {};
	};

	public clearRuntimeCacheForAppId(appId: number)
	{
		delete this.achievements[appId];
		delete this.allAchievements[appId]
		delete this.globalAchievements[appId]
		delete this.loading[appId]
	}

	public clearCache()
	{
		this.clearRuntimeCache()
		this.ids = {}
	}

	public clearCacheForAppId(appId: number)
	{
		this.clearRuntimeCacheForAppId(appId)
		delete this.ids[appId]
	}

	public async saveCache()
	{
		await this.state.settings.readSettings()
		this.state.settings.cache = this.cache;
	}

	public async loadCache()
	{
		await this.state.settings.readSettings()
		this.cache = this.state.settings.cache;
		await this.saveCache()
	}

	private throttle = throttledQueue(4, 1000, true);

	public async getAchievementsForGame(app_id: number): Promise<AchievementsData | undefined>
	{
		return new Promise<AchievementsData | undefined>(async (resolve, reject) => {
			const settings = await this.state.settings;
			this.logger.debug(`${app_id} auth: `, settings.username, settings.api_key)
			if (this.ids[app_id] === null)
				resolve(undefined);
			await this.waitForOnline()
			const shortcut = await getAppDetails(app_id)
			this.logger.debug(`${app_id} shortcut: `, shortcut)
			let hash: string | null = null
			if (shortcut)
			{
				const launchCommand = `${shortcut.strShortcutExe} ${shortcut.strShortcutLaunchOptions}`
				this.logger.debug(`${app_id} launchCommand: `, launchCommand)
				const rom = launchCommand?.match(new RegExp(romRegex, "i"))?.[0];
				this.logger.debug(`${app_id} rom: `, rom)
				if (rom)
				{
					const md5 = (await this.serverAPI.callPluginMethod<{
						path: string
					}, string>("Hash", {path: rom}));
					this.logger.debug(`${app_id} md5: `, md5.result)
					if (md5.success)
					{
						if (md5.result === "")
						{
							this.ids[app_id] = null
							await this.saveCache();
							resolve(undefined);
						}
						else
						{
							this.ids[app_id] = this.hashes[md5.result];
							hash = md5.result
							await this.saveCache();
						}
					} else reject(new Error(md5.result));
				} else
				{
					this.ids[app_id] = null;
					await this.saveCache();
					resolve(undefined);
				}
			} else
			{
				this.ids[app_id] = null;
				await this.saveCache();
				resolve(undefined);
			}
			let game_id: number | undefined | null = this.ids[app_id];
			if (game_id)
			{
				let retry = 0;
				while (retry < 5)
				{
					this.logger.debug(`${app_id} game_id: `, game_id)
					const response = await this.serverAPI.fetchNoCors<{
						body: string;
						status: number
					}>(`https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php?z=${settings.username}&y=${settings.api_key}&u=${settings.username}&g=${game_id}`, {
						headers: {
							"User-Agent": `Emuchievements/${process.env.VERSION} (+https://github.com/EmuDeck/Emuchievements)`
						}
					})
					if (response.success)
					{
						if (response.result.status == 429 || response.result.status == 504 || response.result.status == 500)
						{
							this.logger.debug(`response status was ${response.result.status}, retrying`, retry);
							retry++;
						} else if (response.result.status == 200)
						{
							retry = 5;
							const game = (JSON.parse(response.result.body)) as GameRaw

							this.logger.debug(`${app_id} game: `, game)
							if (game_id && hash)
							{
								const result: AchievementsData = {
									game_id: game_id,
									game: rawGameToGame(game),
									md5: hash,
									last_updated_at: new Date()
								}
								this.achievements[app_id] = result;
								this.logger.debug(`${app_id} result:`, result)
								resolve(result);
								break;
							}
							else {
								resolve(undefined);
								break;
							}

						} else
						{
							this.logger.debug(`gameResponse: ${JSON.stringify(response, undefined, "\t")}`);
							reject(new Error(`${response.result.status}`));
							break;
						}
					} else {
						reject(new Error(response.result));
						break;
					}
				}
				resolve(undefined);
			} else {
				resolve(undefined);
			}
		});
	}


	fetchAchievements(app_id: number): { all: AllAchievements, global: GlobalAchievements, retro?: AchievementsData }
	{
		if (((this.loading)[app_id] == undefined) ? (this.loading)[0] : (this.loading)[app_id])
		{
			return {
				all: {
					loading: true
				},
				global: {
					loading: true
				},
			}
		} else if (!((((this.allAchievements)[app_id] === undefined) ? (this.allAchievements)[0] : (this.allAchievements)[app_id]).data))
		{
			(this.loading)[app_id] = true;
			this.throttle(() => this.achievements[app_id] ?? this.getAchievementsForGame(app_id)).then((retro?: AchievementsData): {
				all: AllAchievements,
				global: GlobalAchievements,
				retro?: AchievementsData
			} => {
				let allAchievements: AllAchievements = {
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
						this.logger.debug("Achievement: ", achievement)
						let steam = retroAchievementToSteamAchievement(achievement, retro.game);
						if (allAchievements.data && globalAchievements.data)
						{
							if (steam.bAchieved)
								allAchievements.data.achieved[steam.strID] = steam
							else
								allAchievements.data.unachieved[steam.strID] = steam

							globalAchievements.data[steam.strID] = (((achievement.num_awarded ? achievement.num_awarded : 0) / (retro.game.num_distinct_players_casual ? retro.game.num_distinct_players_casual : 1)) * 100.0)
						}
					})
					return {
						all: allAchievements,
						global: globalAchievements,
						retro: retro
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
				if (value.retro) (this.achievements)[app_id] = value.retro;
				if (value.retro?.game_id) (this.ids)[app_id] = value.retro.game_id;
				(this.allAchievements)[app_id] = value.all;
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
				all: (this.allAchievements)[app_id],
				global: (this.globalAchievements)[app_id],
				retro: (this.achievements)[app_id]
			}
		}
	}

	fetchAchievementsProgress(app_id: number): AchievementsProgress | undefined
	{
		const achievements = this.fetchAchievements(app_id);
		this.logger.debug("Achievements progress", achievements);
		// If there are achievements, render them in a progress bar.
		if (!!achievements.all.data && !!achievements.retro)
		{
			const achieved = Object.keys(achievements.all.data.achieved).length;
			const total = Object.keys(achievements.all.data.achieved).length + Object.keys(achievements.all.data.unachieved).length;
			return {
				achieved,
				total,
				percentage: (achieved / total) * 100,
				data: achievements.retro
			}
		}
		return
	}

	async fetchAchievementsAsync(app_id: number): Promise<{
		all: AllAchievements,
		global: GlobalAchievements,
		retro?: AchievementsData
	} | undefined>
	{
		return new Promise<{
			all: AllAchievements,
			global: GlobalAchievements,
			retro?: AchievementsData
		} | undefined>(async (resolve) => {
			if (!((((this.allAchievements)[app_id] === undefined) ? (this.allAchievements)[0] : (this.allAchievements)[app_id]).data))
			{
				(this.loading)[app_id] = true;
				resolve(await this.throttle(() => this.achievements[app_id] ?? this.getAchievementsForGame(app_id)).then((retro?: AchievementsData): {
					all: AllAchievements,
					global: GlobalAchievements,
					retro: AchievementsData
				} | undefined => {
					let allAchievements: AllAchievements = {
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
					this.logger.debug(`${app_id} Retro: `, retro)
					if (retro && retro.game.achievements)
					{
						retro.game.achievements.forEach(achievement => {
							this.logger.debug("Achievement: ", achievement)
							let steam = retroAchievementToSteamAchievement(achievement, retro.game);
							if (allAchievements.data && globalAchievements.data)
							{
								if (steam.bAchieved)
									allAchievements.data.achieved[steam.strID] = steam
								else
									allAchievements.data.unachieved[steam.strID] = steam

								globalAchievements.data[steam.strID] = (((achievement.num_awarded ? achievement.num_awarded : 0) / (retro.game.num_distinct_players_casual ? retro.game.num_distinct_players_casual : 1)) * 100.0)
							}
						})
						this.logger.debug(`${app_id} Achievements: `, allAchievements)
						return {
							all: allAchievements,
							global: globalAchievements,
							retro: retro
						};
					} else
						return undefined
				}).then(value => {
					if (value)
					{
						if (value.retro) (this.achievements)[app_id] = value.retro;
						if (value.retro?.game_id) (this.ids)[app_id] = value.retro.game_id;
						(this.allAchievements)[app_id] = value.all;
						(this.globalAchievements)[app_id] = value.global;
					}
					(this.loading)[app_id] = false;

					return value;
				}));
			} else
			{
				resolve({
					all: (this.allAchievements)[app_id],
					global: (this.globalAchievements)[app_id],
					retro: (this.achievements)[app_id]
				});
			}
		});
	}

	async refresh_achievements(): Promise<void>
	{
		if (await this.state.loggedIn)
		{
			if (!this.globalLoading)
			{
				this.globalLoading = true;
				this.game = this.t("fetching")
				this.fetching = true;
				this.clearRuntimeCache();
				await this.refresh_achievements_for_apps((await getAllNonSteamAppIds()).filter(appId => this.ids[appId] !== null))
			}
		} else
		{
			this.serverAPI.toaster.toast({
				title: this.t("title"),
				body: this.t("noLogin"),
			})
		}

	}

	async refresh_achievements_for_apps(app_ids: number[]): Promise<void>
	{
		this.fetching = false;
		this.total = app_ids.length;
		this.processed = 0;
		await Promise.map(app_ids, (async (app_id) => await this.refresh_achievements_for_app(app_id)), {
			concurrency: 8
		});
		this.globalLoading = false;
		this.game = this.t("fetching");
		this.description = "";
		this.processed = 0;
		this.total = 0;
	}

	private async refresh_achievements_for_app(app_id: number): Promise<void>
	{
		const overview = appStore.GetAppOverviewByAppID(app_id);

		const details = await getAppDetails(app_id)
		const data = await this.count_achievements_for_app(app_id)
		if (details && data.numberOfAchievements !== 0)
		{
			this.game = overview.display_name;
			this.description = format(this.t("foundAchievements"), data.numberOfAchievements, data.hash);
			this.processed++;
		} else
		{
			this.game = overview.display_name;
			this.description = this.t("noAchievements")
			this.processed++;
		}
		this.logger.debug(`loading achievements: ${this.state.loadingData.percentage}% done`, app_id, details, overview)
	}

	async count_achievements_for_app(app_id: number): Promise<{ numberOfAchievements: number, hash?: string }>
	{
		let numberOfAchievements = 0;
		let achievements = await this.fetchAchievementsAsync(app_id)
		if (achievements)
		{
			this.logger.debug(app_id, this.allAchievements)


			if (!!this.allAchievements[app_id])
			{
				const ret = this.allAchievements[app_id]?.data
				if (!!ret)
				{
					if (!appAchievementProgressCache.m_achievementProgress)
					{
						await appAchievementProgressCache.RequestCacheUpdate()
					}
					numberOfAchievements = Object.keys(ret.achieved).length + Object.keys(ret.unachieved).length;
					const nAchieved = Object.keys(ret.achieved).length;
					const nTotal = Object.keys(ret.achieved).length + Object.keys(ret.unachieved).length;
					runInAction(() => {
						appAchievementProgressCache.m_achievementProgress.mapCache.set(app_id, {
							all_unlocked: nAchieved === nTotal,
							appid: app_id,
							cache_time: new Date().getTime(),
							percentage: (nAchieved / nTotal) * 100,
							total: nTotal,
							unlocked: nAchieved
						});
						appAchievementProgressCache.SaveCacheFile()
						this.logger.debug(`achievementsCache: `, {
							all_unlocked: nAchieved === nTotal,
							appid: app_id,
							cache_time: new Date().getTime(),
							percentage: (nAchieved / nTotal) * 100,
							total: nTotal,
							unlocked: nAchieved
						}, appAchievementProgressCache.m_achievementProgress.mapCache.get(app_id))
					})
				}
			}

		}
		return {
			numberOfAchievements,
			hash: achievements?.retro?.md5
		}
	}

	async refresh_shortcuts(): Promise<void>
	{
		const shortcuts = await getAllNonSteamAppOverview();
		const hidden = this.state.settings.hidden;
		this.logger.debug("hidden: ", hidden);
		let app_ids: number[] = shortcuts.map(shortcut => shortcut.appid).filter(appid => this.isReady(appid));
		for (const app_id of app_ids)
		{
			await showApp(app_id);
		}

		if (hidden)
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

	async refresh(): Promise<void>
	{
		await this.refresh_achievements();
		await this.refresh_shortcuts();
	}

	async init(): Promise<void>
	{
		await this.loadCache();
		const response = await this.serverAPI.fetchNoCors<{
			body: string;
			status: number
		}>("https://retroachievements.org/dorequest.php?r=hashlibrary", {
			headers: {
				"User-Agent": `Emuachievements/${process.env.VERSION} (+https://github.com/EmuDeck/Emuchievements)`
			}
		})
		if (response.success)
		{
			this.hashes = (JSON.parse(response.result.body) as {MD5List: Record<string, number>}).MD5List
		}
		await this.refresh();
	}

	async deinit(): Promise<void>
	{
	}

	isReady(steamAppId: number): boolean
	{
		// this.logger.debug("isReady", steamAppId, this.achievements[steamAppId])
		return !!this.allAchievements[steamAppId] && !this.allAchievements[steamAppId].loading;
	}
}