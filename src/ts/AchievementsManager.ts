import {ServerAPI, sleep} from "decky-frontend-lib";
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

	get currentGame(): string
	{
		return this.state.loadingData.currentGame;
	}

	set currentGame(value: string)
	{
		this.state.loadingData.currentGame = value;
	}

	get serverAPI(): ServerAPI {
		return this.state.serverAPI;
	}

	async checkOnlineStatus()
	{
		try {
			const online = await this.serverAPI.fetchNoCors<{ body: string; status: number }>("https://example.com");
			this.logger.debug(online)
			return online.success && online.result.status >= 200 && online.result.status < 300; // either true or false
		} catch (err) {
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

	private achievements: { [key: number]: AllAchievements } = {0: {loading: false}};

	private hashes: { [key: number]: string } = {};

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
		this.achievements = {0: {loading: false}};
		this.loading = {0: false};
		this.hashes = {};
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
				await this.waitForOnline()
				const shortcut = await getAppDetails(app_id)
				this.logger.debug(`${app_id} shortcut: `, shortcut)
				if (shortcut)
				{
					const launchCommand = `${shortcut.strShortcutExe} ${shortcut.strShortcutLaunchOptions}`
					this.logger.debug(`${app_id} launchCommand: `, launchCommand)
					const rom = launchCommand?.match(new RegExp(romRegex, "i"))?.[0];
					this.logger.debug(`${app_id} rom: `, rom)
					if (rom)
					{
						const md5 = (await this.serverAPI.callPluginMethod<{ path: string }, string>("Hash", {path: rom}));
						this.logger.debug(`${app_id} md5: `, md5.result)
						if (md5.success)
						{
							const response = (await this.serverAPI.fetchNoCors<{ body: string; status: number }>(`https://retroachievements.org/dorequest.php?r=gameid&m=${md5.result}`, {
								headers: {
									"User-Agent": `Emuchievements/${process.env.VERSION} (+https://github.com/EmuDeck/Emuchievements)`
								}
							}))
							if (response.success)
							{
								if (response.result.status == 200)
								{
									const game_id: number = (JSON.parse(response.result.body) as { Success: boolean, GameID: number }).GameID;
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
												md5: md5.result,
												last_updated_at: new Date()
											}
											await this.updateCache(`${app_id}`, result);
											this.logger.debug(`${app_id} result:`, result)
											resolve(result);
										} else reject(new Error(achievement.result));
									} else resolve(undefined);
								} else this.logger.debug(`response: ${JSON.stringify(response, undefined, "\t")}`); reject(new Error(`${response.result.status}`));
							} else reject(new Error(response.result));
						} else reject(new Error(md5.result));
					} else resolve(undefined);
				} else resolve(undefined);
			}
		});
	}

	fetchAchievements(app_id: number): { all: AllAchievements, global: GlobalAchievements, md5: string | undefined }
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
				md5: undefined
			}
		} else if (!((((this.achievements)[app_id] === undefined) ? (this.achievements)[0] : (this.achievements)[app_id]).data))
		{
			(this.loading)[app_id] = true;
			this.getAchievementsForGame(app_id).then((retro: AchievementsData | undefined): { all: AllAchievements, global: GlobalAchievements, md5: string | undefined } => {
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
						this.logger.debug("Achievement: ", achievement)
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
						global: globalAchievements,
						md5: retro.md5
					};
				} else
					return {
						all: {
							loading: true,
						},
						global: {
							loading: true,
						},
						md5: undefined
					}
			}).then(value => {
				if (value.md5) (this.hashes)[app_id] = value.md5;
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
				},
				md5: undefined
			}
		} else
		{
			return {
				all: (this.achievements)[app_id],
				global: (this.globalAchievements)[app_id],
				md5: (this.hashes)[app_id]
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

	async fetchAchievementsAsync(app_id: number): Promise<{ all: AllAchievements, global: GlobalAchievements, md5: string | undefined } | undefined>
	{
		return new Promise<{ all: AllAchievements, global: GlobalAchievements, md5: string | undefined } | undefined>(async (resolve) => {
			if (!((((this.achievements)[app_id] === undefined) ? (this.achievements)[0] : (this.achievements)[app_id]).data))
			{
				(this.loading)[app_id] = true;
				resolve(await this.getAchievementsForGame(app_id).then((retro: AchievementsData | undefined): { all: AllAchievements, global: GlobalAchievements, md5: string | undefined } | undefined => {
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
							this.logger.debug("Achievement: ", achievement)
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
							global: globalAchievements,
							md5: retro.md5
						};
					} else
						return undefined
				}).then(value => {
					if (value)
					{
						if(value.md5) (this.hashes)[app_id] = value.md5;
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
					global: (this.globalAchievements)[app_id],
					md5: (this.hashes)[app_id]
				});
			}
		});
	}

	async refresh_achievements(): Promise<void>
	{
		this.clearCache();
		await this.refresh_achievements_for_apps((await getAllNonSteamAppOverview()).sort((a, b) => {

			if (a.display_name < b.display_name) {
				return -1;
			}
			if (a.display_name > b.display_name) {
				return 1;
			}
			return 0;
		}).map(overview => overview.appid))
	}

	async refresh_achievements_for_apps(app_ids: number[]): Promise<void>
	{
		this.globalLoading = true;
		this.total = app_ids.length;
		this.processed = 0;
		await Promise.map(app_ids, (async (app_id) => await this.refresh_achievements_for_app(app_id)), {
			concurrency: 3
		});
		this.globalLoading = false;
	}

	private async refresh_achievements_for_app(app_id: number): Promise<void>
	{
		const overview = appStore.GetAppOverviewByAppID(app_id);

		const details = await getAppDetails(app_id)
		if (details)
		{
			const numberOfAchievements = await this.set_achievements_for_details(app_id, details)
			this.currentGame = `${(`${overview.display_name} ` ?? "")}: ${numberOfAchievements.numberOfAchievements !== 0 ? `loaded ${numberOfAchievements.numberOfAchievements}, hash: ${numberOfAchievements.hash}` : "no achievements found"}`;
			this.processed++;
		}
		else
		{
			this.currentGame = `${(`${overview.display_name} ` ?? "")}: no achievements found`;
			this.processed++;
		}
		this.logger.debug(`loading achievements: ${this.state.loadingData.percentage}% done`, app_id, details, overview)
	}

	async set_achievements_for_details(app_id: number, details: SteamAppDetails): Promise<{ numberOfAchievements: number, hash: string }>
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
		return {
			numberOfAchievements,
			hash: this.hashes[app_id]
		}
	}

	async refresh_shortcuts(): Promise<void>
	{
		const shortcuts = await getAllNonSteamAppOverview();
		const hidden = await this.serverAPI.callPluginMethod<{}, boolean>("isHidden", {});
		this.logger.debug("hidden: ", hidden);
		let app_ids: number[] = shortcuts.map(shortcut => shortcut.appid).filter(appid => this.isReady(appid));
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