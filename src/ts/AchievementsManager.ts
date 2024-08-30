import { ServerAPI, sleep } from "decky-frontend-lib";
import { rawGameToGame, retroAchievementToSteamAchievement } from "./Mappers";
import Logger from "./logger";
import { EmuchievementsState } from "./hooks/achievementsContext";
import
{
	checkOnlineStatus,
	getAllNonSteamAppIds,
	getAppDetails,
	waitForOnline,
} from "./steam-utils";
import { AllAchievements, GlobalAchievements } from "./SteamTypes";
import { Promise } from "bluebird";
import { runInAction } from "mobx";
import { format, getTranslateFunc } from "./useTranslations";
import throttledQueue from "throttled-queue";
import { CacheData, CustomIdsOverrides } from "./settings";
import { GameInfoAndUserProgress as Game, GetGameInfoAndUserProgressResponse as GameRaw } from "@retroachievements/api";

// localforage.config({
// 	name: "emuchievements",
// 	storeName: "achievements"
// });

// const romRegex = "(\\/([a-zA-Z\\d-:_.\\s])+)+(?!\\.AppImage)(\\.zip|\\.7z|\\.iso|\\.bin|\\.chd|\\.cue|\\.img|\\.a26|\\.lnx|\\.ngp|\\.ngc|\\.3dsx|\\.3ds|\\.app|\\.axf|\\.cci|\\.cxi|\\.elf|\\.n64|\\.ndd|\\.u1|\\.v64|\\.z64|\\.nds|\\.dmg|\\.gbc|\\.gba|\\.gb|\\.ciso|\\.dol|\\.gcm|\\.gcz|\\.nkit\\.iso|\\.rvz|\\.wad|\\.wia|\\.wbfs|\\.nes|\\.fds|\\.unif|\\.unf|\\.json|\\.kp|\\.nca|\\.nro|\\.nso|\\.nsp|\\.xci|\\.rpx|\\.wud|\\.wux|\\.wua|\\.32x|\\.cdi|\\.gdi|\\.m3u|\\.gg|\\.gen|\\.md|\\.smd|\\.sms|\\.ecm\\|.mds|\\.pbp|\\.dump|\\.gz|\\.mdf|\\.mrg|\\.prx|\\.bs|\\.fig|\\.sfc|\\.smc|\\.swx|\\.pc2|\\.wsc|\\.ws)";
const romRegex =
	'(\\/([^/"])+)+(?!\\.AppImage)(\\.zip|\\.7z|\\.iso|\\.bin|\\.chd|\\.cue|\\.img|\\.a26|\\.lnx|\\.ngp|\\.ngc|\\.elf|\\.n64|\\.ndd|\\.u1|\\.v64|\\.z64|\\.nds|\\.dmg|\\.gbc|\\.gba|\\.gb|\\.ciso|\\.cso|\\.rom|\\.nes|\\.fds|\\.unif|\\.unf|\\.32x|\\.cdi|\\.gdi|\\.m3u|\\.gg|\\.gen|\\.smd|\\.sms|\\.ecm|\\.mds|\\.pbp|\\.dump|\\.gz|\\.mdf|\\.mrg|\\.prx|\\.bs|\\.fig|\\.sfc|\\.smc|\\.swx|\\.pc2|\\.wsc|\\.ws|\\.md)';

export interface Manager
{
	state: EmuchievementsState;

	init(): Promise<void>;

	deinit(): Promise<void>;

	refresh(): Promise<void>;
}

export enum StoreCategory
{
	MultiPlayer = 1,
	SinglePlayer = 2,
	CoOp = 9,
	PartialController = 18,
	MMO = 20,
	Achievements = 22,
	SteamCloud = 23,
	SplitScreen = 24,
	CrossPlatformMultiPlayer = 27,
	FullController = 28,
	TradingCards = 29,
	Workshop = 30,
	VRSupport = 31,
	OnlineMultiPlayer = 36,
	LocalMultiPlayer = 37,
	OnlineCoOp = 38,
	LocalCoOp = 392,
	RemotePlayTogether = 44,
	HighQualitySoundtrackAudio = 50
}

export interface AchievementsData
{
	game: Game,
	last_updated_at: Date,
	game_id: number,
	md5: string;
}

export interface AchievementsProgress
{
	achieved: number;
	total: number;
	percentage: number;
	data: AchievementsData;
}

export interface AchievementsProgress
{
	achieved: number,
	total: number,
	percentage: number;
}

export interface FetchedAchievements
{
	user: AllAchievements,
	global: GlobalAchievements,
	retro?: AchievementsData;
}

const loadingFetchedAchievements: FetchedAchievements = {
	user: { loading: true },
	global: { loading: true },
	retro: undefined,
};

export class AchievementManager implements Manager
{
	private t = getTranslateFunc();

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

	get errored(): boolean
	{
		return this.state.loadingData.errored;
	}

	set errored(value: boolean)
	{
		this.state.loadingData.errored = value;
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

	constructor(state: EmuchievementsState)
	{
		this._state = state;
	}

	private cache: CacheData = {
		ids: {},
		custom_ids_overrides: {},
	};

	private hashes: Record<string, number> = {};

	private get ids()
	{
		return this.cache.ids;
	}

	private set ids(value: Record<number, number | null>)
	{
		this.cache.ids = value;
	}

	private get customIdsOverrides() {
		return this.cache.custom_ids_overrides;
	}

	private set customIdsOverrides(value: Record<number, CustomIdsOverrides>) {
		this.cache.custom_ids_overrides = value;
	}

	private achievements: Record<number, AchievementsData> = {};

	private userAchievements: Record<number, AllAchievements> = { 0: { loading: false } };

	private globalAchievements: Record<number, GlobalAchievements> = { 0: { loading: false } };

	private loading: Record<number, boolean> = { 0: false };

	private logger: Logger = new Logger("AchievementManager");

	public clearRuntimeCache()
	{
		this.userAchievements = { 0: { loading: false } };
		this.globalAchievements = { 0: { loading: false } };
		this.loading = { 0: false };
		this.achievements = {};
	}

	public clearRuntimeCacheForAppId(appId: number)
	{
		delete this.achievements[appId];
		delete this.userAchievements[appId];
		delete this.globalAchievements[appId];
		delete this.loading[appId];
	}

	public clearCache()
	{
		this.clearRuntimeCache();

		this.ids = {};
		this.customIdsOverrides = {};
	}

	public clearCacheForAppId(appId: number)
	{
		this.clearRuntimeCacheForAppId(appId);

		delete this.ids[appId];
		delete this.customIdsOverrides[appId];
	}

	public async saveCache()
	{
		this.state.settings.cache = this.cache;
	}

	public async loadCache()
	{
		await this.state.settings.readSettings();
		this.cache = this.state.settings.cache;
		await this.saveCache();
	}

	private throttle = throttledQueue(4, 1000, true);

	public async getAchievementsForGame(app_id: number): Promise<AchievementsData | undefined>
	{
		const settings = this.state.settings;
		this.logger.debug(`${app_id} auth: `, settings.retroachievements.username, settings.retroachievements.api_key);

		if (this.ids[app_id] === null && (this.customIdsOverrides[app_id] && this.customIdsOverrides[app_id]?.retro_achivement_game_id === null)) {
			return undefined;
		};

		await waitForOnline(this.serverAPI);
		const shortcut = await getAppDetails(app_id);
		this.logger.debug(`${app_id} shortcut: `, shortcut);
		let hash: string | null = null;

		if (shortcut)
		{
			const launchCommand = `${shortcut.strShortcutExe} ${shortcut.strShortcutLaunchOptions}`;
			this.logger.debug(`${app_id} launchCommand: `, launchCommand);
			const rom = launchCommand?.match(new RegExp(romRegex, "i"))?.[0];
			this.logger.debug(`${app_id} rom: `, rom);
			if (rom)
			{
				if (!this.customIdsOverrides) {
					this.customIdsOverrides = {}

					await this.saveCache();
				}

				if (!this.customIdsOverrides[app_id]) {
					this.ids[app_id] = null;
					this.customIdsOverrides[app_id] = {
						name: shortcut.strDisplayName,
						retro_achivement_game_id: null,
					}

					await this.saveCache();
				}

				if (this.customIdsOverrides[app_id] && this.customIdsOverrides[app_id]?.retro_achivement_game_id) {
					const { retro_achivement_game_id } = this.customIdsOverrides[app_id]
					this.ids[app_id] = retro_achivement_game_id

					const getAppMd5Hash = () => {
						const { hash } = this.customIdsOverrides[app_id]

						if (typeof hash === 'string') {
							return hash
						}

						return Object.keys(this.hashes).find((md5) => this.hashes[md5] === retro_achivement_game_id);
					}

					const appMd5Hash = getAppMd5Hash();

					if (appMd5Hash) {
						hash = appMd5Hash

						// NOTE: If app does not have detected `hash` we save one, to improve performance in
						// future detects
						if (!this.customIdsOverrides[app_id]?.hash) {
							this.customIdsOverrides[app_id].hash = appMd5Hash;
						}

						this.ids[app_id] = this.hashes[hash];
					}

					await this.saveCache();
				} else {
					const md5 = await this.serverAPI.callPluginMethod<
						{
							path: string;
						},
						string
					>("hash", { path: rom });
					this.logger.debug(`${app_id} md5: `, md5.result);
					if (md5.success)
					{
						if (md5.result === "")
						{
							this.ids[app_id] = null;
							await this.saveCache();
							return undefined;
						} else
						{
							this.ids[app_id] = this.hashes[md5.result];
							hash = md5.result;
							await this.saveCache();
						}
					} else throw new Error(md5.result);
				}
			} else
			{
				this.ids[app_id] = null;
				await this.saveCache();
				return undefined;
			}
		} else
		{
			this.ids[app_id] = null;
			await this.saveCache();
			return undefined;
		}
		let game_id: number | undefined | null = this.ids[app_id];
		if (typeof game_id === "number" && game_id !== 0)
		{
			let retry = 0;
			let sleep_ms = 2000;
			while (retry < 5)
			{
				this.logger.debug(`${app_id} game_id: `, game_id);
				if (retry > 0)
				{
					await sleep(sleep_ms);
					sleep_ms *= 2;
				}
				const response = await this.serverAPI.fetchNoCors<{
					body: string;
					status: number;
				}>(
					`https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php?z=${settings.retroachievements.username}&y=${settings.retroachievements.api_key}&u=${settings.retroachievements.username}&g=${game_id}`,
					{
						headers: {
							"User-Agent": `Emuchievements/${process.env.VERSION} (+https://github.com/EmuDeck/Emuchievements)`,
						},
					}
				);
				if (response.success)
				{
					if (
						response.result.status == 429 ||
						response.result.status == 504 ||
						response.result.status == 500
					)
					{
						this.logger.debug(`response status was ${response.result.status}, retrying`, retry);
						retry++;
					} else if (response.result.status == 200)
					{
						const game = JSON.parse(response.result.body) as GameRaw;

						this.logger.debug(`${app_id} game: `, game);
						if (game_id && hash)
						{
							const result: AchievementsData = {
								game_id: game_id,
								game: rawGameToGame(game),
								md5: hash,
								last_updated_at: new Date(),
							};
							if (Object.keys(result.game?.achievements)?.length == 0)
							{
								return undefined;
							}
							this.achievements[app_id] = result;
							this.logger.debug(`${app_id} result:`, result);
							return result;
						} else
						{
							return undefined;
						}
					} else
					{
						this.logger.debug(`gameResponse: ${JSON.stringify(response, undefined, "\t")}`);
						throw new Error(`${response.result.status}`);
					}
				} else
				{
					throw new Error(response.result);
				}
			}
			throw new Error("Maximum retries exceeded");
		} else
		{
			return undefined;
		}
	}

	processRetroAchievements(retro: AchievementsData): FetchedAchievements
	{
		if (Object.values(retro.game.achievements).length == 0)
		{
			return loadingFetchedAchievements;
		}

		const { achievements, numDistinctPlayersCasual } = retro.game;

		const defaultAchievements: AllAchievements = {
			data: { achieved: {}, hidden: {}, unachieved: {} },
			loading: false,
		};

		const defaultGlobalAchievements: GlobalAchievements = {
			data: {},
			loading: false,
		};

		const { user, global } = Object.entries(achievements)
			.reduce((result, [_, achievement]) =>
			{
				this.logger.debug('Achievement: ', achievement);
				const steam = retroAchievementToSteamAchievement(achievement, retro.game, this.state.settings.general.show_achieved_state_prefixes);

				if (result.user.data && result.global.data)
				{
					steam.bAchieved ?
						result.user.data.achieved[steam.strID] = steam :
						result.user.data.unachieved[steam.strID] = steam;

					result.global.data[steam.strID] = ((achievement.numAwarded || 0) / (numDistinctPlayersCasual || 1)) * 100.0;
				}

				return result;
			}, { user: defaultAchievements, global: defaultGlobalAchievements });

		return {
			user,
			global,
			retro,
		};
	}

	fetchAchievements(app_id: number): FetchedAchievements
	{
		const loading = this.loading[app_id] ?? this.loading[0];
		const user = this.userAchievements[app_id] ?? this.achievements[0];
		const global = this.globalAchievements[app_id] ?? this.globalAchievements[0];
		const retro = this.achievements[app_id];
		if (loading)
		{
			return loadingFetchedAchievements;
		}
		if (!user?.data)
		{
			this.loading[app_id] = true;
			this.throttle(async () =>
			{
				const result = this.achievements[app_id] ? this.processRetroAchievements(this.achievements[app_id]) : await this.getAchievementsForGame(app_id)
					.then(
						(
							retro?: AchievementsData
						): FetchedAchievements =>
						{
							if (retro && retro.game.achievements)
							{
								return this.processRetroAchievements(retro);
							} else
							{
								return loadingFetchedAchievements;
							}
						});

				if (result?.retro && result?.retro?.game_id)
				{
					this.achievements[app_id] = result?.retro;
					this.ids[app_id] = result?.retro?.game_id;
				}

				this.userAchievements[app_id] = result.user;
				this.globalAchievements[app_id] = result.global;
				this.loading[app_id] = false;
			});

			return loadingFetchedAchievements;
		} else
		{
			return {
				user,
				global,
				retro
			};
		}
	}

	fetchAchievementsProgress(app_id: number): AchievementsProgress | undefined
	{
		const achievements = this.fetchAchievements(app_id);
		this.logger.debug("Achievements progress", achievements);
		// If there are achievements, render them in a progress bar.
		if (!!achievements.user.data && !!achievements.retro)
		{
			const achieved = Object.keys(achievements.user.data.achieved).length;
			const total =
				Object.keys(achievements.user.data.achieved).length +
				Object.keys(achievements.user.data.unachieved).length;
			return {
				achieved,
				total,
				percentage: (achieved / total) * 100,
				data: achievements.retro,
			};
		}
		return;
	}

	async fetchAchievementsAsync(app_id: number): Promise<FetchedAchievements | undefined>
	{
		const loading = this.loading[app_id] ?? this.loading[0];
		const user = this.userAchievements[app_id] ?? this.achievements[0];
		const global = this.globalAchievements[app_id] ?? this.globalAchievements[0];
		const retro = this.achievements[app_id];

		if (loading)
		{
			return loadingFetchedAchievements;
		}
		if (!user?.data)
		{
			this.loading[app_id] = true;
			return await this.throttle(async () =>
			{
				const result = this.achievements[app_id] ? this.processRetroAchievements(this.achievements[app_id]) : await this.getAchievementsForGame(app_id)
					.then(
						(
							retro?: AchievementsData
						): FetchedAchievements =>
						{
							if (retro && retro.game.achievements)
							{
								return this.processRetroAchievements(retro);
							} else
							{
								return loadingFetchedAchievements;
							}
						});

				if (result?.retro && result?.retro?.game_id)
				{
					this.achievements[app_id] = result?.retro;
					this.ids[app_id] = result?.retro?.game_id;
				}

				this.userAchievements[app_id] = result.user;
				this.globalAchievements[app_id] = result.global;
				this.loading[app_id] = false;

				return result;

			});
		} else
		{
			return {
				user,
				global,
				retro,
			};
		}
	}

	async refreshAchievements(): Promise<void>
	{
		try
		{
			this.errored = false
			if (!await checkOnlineStatus(this.serverAPI))
				throw new Error("No Internet");
			if (await this.state.loggedIn)
			{
				if (!this.globalLoading)
				{
					this.globalLoading = true;
					this.game = this.t("fetching");
					this.fetching = true;
					this.clearRuntimeCache();

					const allNonSteamAppIds = await getAllNonSteamAppIds();
					const nonSteamAppIdsWithRetroAchievementId = allNonSteamAppIds.filter((appId) => {
							if (this.ids[appId] !== null) {
								return true;
							}

							if (this.customIdsOverrides[appId] && this.customIdsOverrides[appId].retro_achivement_game_id !== null) {
								return true;
							}

							return false;
						})

					// NOTE: Checks for games what does not exists in user library and removes them from
					//       `cache` configuration
					const gameIdsToBeRemoved = Object.keys(this.customIdsOverrides)
						.filter((appId) => !allNonSteamAppIds.includes(Number.parseInt(appId, 10)));

					for (const gameIdToBeRemoved of gameIdsToBeRemoved) {
						const gameIdToBeRemovedAsNumber = Number.parseInt(gameIdToBeRemoved, 10);

						delete this.ids[gameIdToBeRemovedAsNumber]
						delete this.customIdsOverrides[gameIdToBeRemovedAsNumber]
					}

					await this.refreshAchievementsForApps(nonSteamAppIdsWithRetroAchievementId);
				}
			} else
			{
				this.serverAPI.toaster.toast({
					title: this.t("title"),
					body: this.t("noLogin"),
				});
			}
		} catch (e: any)
		{
			this.globalLoading = false;
			this.errored = true;
			this.description = `${e.constructor.name}: ${e.message}`;

			this.logger.error(e, `${e.constructor.name}: ${e.message}`);
		}
	}

	async refreshAchievementsForApps(app_ids: number[]): Promise<void>
	{
		try
		{
			this.fetching = false;
			this.total = app_ids.length;
			this.processed = 0;

			await Promise.map(app_ids, async (app_id) => await this.refreshAchievementsForApp(app_id), {
				concurrency: 8,
			});

			this.globalLoading = false;
			this.game = this.t("fetching");
			this.description = "";
			this.processed = 0;
			this.total = 0;
		} catch (e)
		{
			throw e;
		}
	}

	private async refreshAchievementsForApp(app_id: number): Promise<void>
	{
		try
		{
			await this.throttle(async () =>
			{
				const overview = appStore.GetAppOverviewByAppID(app_id);

				const details = await getAppDetails(app_id);
				const data = await this.countAchievementsForApp(app_id);
				if (details && data.numberOfAchievements !== 0)
				{
					this.game = overview.display_name;
					this.description = format(this.t("foundAchievements"), data.numberOfAchievements, data.hash);
					this.processed++;
				} else
				{
					this.game = overview.display_name;
					this.description = this.t("noAchievements");
					this.processed++;
				}
				this.logger.debug(
					`loading achievements: ${this.state.loadingData.percentage}% done`,
					app_id,
					details,
					overview
				);
			});
		} catch (e)
		{
			throw e;
		}
	}

	async countAchievementsForApp(app_id: number): Promise<{ numberOfAchievements: number; hash?: string; }>
	{
		try
		{
			let numberOfAchievements = 0;
			let achievements = await this.fetchAchievementsAsync(app_id);
			if (achievements)
			{
				this.logger.debug(app_id, this.userAchievements);

				if (!!this.userAchievements[app_id])
				{
					const ret = this.userAchievements[app_id]?.data;
					if (!!ret)
					{
						if (!appAchievementProgressCache.m_achievementProgress)
						{
							await appAchievementProgressCache.RequestCacheUpdate();
						}
						numberOfAchievements =
							Object.keys(ret.achieved).length + Object.keys(ret.unachieved).length;
						const nAchieved = Object.keys(ret.achieved).length;
						const nTotal = Object.keys(ret.achieved).length + Object.keys(ret.unachieved).length;
						runInAction(() =>
						{
							appAchievementProgressCache.m_achievementProgress.mapCache.set(app_id, {
								all_unlocked: nAchieved === nTotal,
								appid: app_id,
								cache_time: new Date().getTime(),
								percentage: (nAchieved / nTotal) * 100,
								total: nTotal,
								unlocked: nAchieved,
							});
							appAchievementProgressCache.SaveCacheFile();
							this.logger.debug(
								`achievementsCache: `,
								{
									all_unlocked: nAchieved === nTotal,
									appid: app_id,
									cache_time: new Date().getTime(),
									percentage: (nAchieved / nTotal) * 100,
									total: nTotal,
									unlocked: nAchieved,
								},
								appAchievementProgressCache.m_achievementProgress.mapCache.get(app_id)
							);
						});
					}
				}
			}
			return {
				numberOfAchievements,
				hash: achievements?.retro?.md5,
			};
		} catch (e)
		{
			throw e;
		}
	}

	async refresh(): Promise<void>
	{
		await this.refreshAchievements();
	}

	async init(): Promise<void>
	{
		await this.loadCache();
		const response = await this.serverAPI.fetchNoCors<{
			body: string;
			status: number;
		}>("https://retroachievements.org/dorequest.php?r=hashlibrary", {
			headers: {
				"User-Agent": `Emuchievements/${process.env.VERSION} (+https://github.com/EmuDeck/Emuchievements)`,
			},
		});
		if (response.success)
		{
			this.hashes = (
				JSON.parse(response.result.body.toLowerCase()) as { md5list: Record<string, number>; }
			).md5list;
		}
		await this.refresh();
	}

	async deinit(): Promise<void> { }

	isReady(steamAppId: number): boolean
	{
		// this.logger.debug("isReady", steamAppId, this.achievements[steamAppId])
		return !!this.userAchievements[steamAppId] && !this.userAchievements[steamAppId].loading;
	}
}