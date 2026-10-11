import
{
	afterPatch,
	beforePatch,
	callOriginal,
	findModuleChild,
	Patch,
	replacePatch,
	Router,
	staticClasses
} from "@decky/ui";
import { definePlugin, routerHook } from "@decky/api";
import { FaClipboardCheck } from "react-icons/fa";
import { SettingsComponent } from "./components/settingsComponent";
import { EmuchievementsComponent } from "./components/emuchievementsComponent";
import { EmuchievementsState, EmuchievementsStateContextProvider } from "./hooks/achievementsContext";
import Logger from "./logger";
import
{
	AppDetailsStore, AppStore,
	CollectionStore,
	SteamAppAchievement,
	SteamAppOverview
} from "./SteamTypes";
import { checkOnlineStatus, waitForOnline } from "./steam-utils";
import { EventBus, MountManager } from "./System";
import { patchAppPage } from "./RoutePatches";
import { runInAction } from "mobx";
import { getTranslateFunc } from "./useTranslations";
import { GameListComponent } from "./components/gameListComponent";
import { StoreCategory } from "./AchievementsManager"
declare global
{
	// @ts-ignore
	let SteamClient: SteamClient;
	let appStore: AppStore;
	// @ts-ignore
	let appDetailsStore: AppDetailsStore;

	let appDetailsCache: any;
	// let appDetailsCache: {
	// 	SetCachedDataForApp(appid: number, field: string, number: number, data: any): void;
	// };

	let appAchievementProgressCache: {
		m_achievementProgress: {
			nVersion: number,
			mapCache: Map<number, {
				all_unlocked: boolean,
				appid: number,
				cache_time: number,
				percentage: number,
				total: number,
				unlocked: number;
			}>;
		};
		RequestCacheUpdate(): Promise<void>;
		LoadCacheFile(): Promise<void>;
		SaveCacheFile(): Promise<void>;
	};

	let collectionStore: CollectionStore;
}

function safeFindModuleChild<T>(filter: (m: any) => T | undefined): T | undefined
{
	try
	{
		return findModuleChild(filter);
	} catch (e)
	{
		console.error("[Emuchievements] findModuleChild scan failed, Steam's webpack internals may have changed", e);
		return undefined;
	}
}

const AppDetailsSections = safeFindModuleChild((m) =>
{
	if (typeof m !== 'object') return;
	for (const prop in m)
	{
		try
		{
			if (
				typeof m[prop] === 'function' &&
				typeof m[prop].prototype?.GetSections === 'function'
			) return m[prop];
		} catch (_) {}
	}
	return;
});

const Achievements = safeFindModuleChild(module =>
{
	if (typeof module !== 'object') return undefined;
	for (let prop in module)
	{
		try
		{
			if (module[prop]?.m_mapMyAchievements) return module[prop];
		} catch (_) {}
	}
});

interface Hook
{
	unregister(): void;
}

export default definePlugin(function ()
{
	const t = getTranslateFunc();
	const logger = new Logger("Index");
	const state = new EmuchievementsState();
	let lifetimeHook: Hook;

	const eventBus = new EventBus();
	const mountManager = new MountManager(eventBus, logger);

	logger.debug(Achievements);

	mountManager.addPageMount("/emuchievements/settings", () =>
		<EmuchievementsStateContextProvider emuchievementsState={state}>
			<SettingsComponent />
		</EmuchievementsStateContextProvider>
	);

	mountManager.addPageMount("/emuchievements/achievements", () =>
		<EmuchievementsStateContextProvider emuchievementsState={state}>
			<GameListComponent />
		</EmuchievementsStateContextProvider>
	);

	if (Achievements)
	{
		mountManager.addPatchMount({
			patch(): Patch
			{
				return replacePatch(
					Achievements.__proto__,
					"LoadMyAchievements",
					args =>
					{
						//console.log(args, appStore.GetAppOverviewByAppID(args[0]), appDetailsStore.GetAppDetails(args[0]));
						if (appStore.GetAppOverviewByAppID(args[0])?.app_type === 1073741824 && !Achievements.m_mapGlobalAchievements.has(args[0]))
						{
							let data = state.managers.achievementManager.fetchAchievements(args[0]);
							logger.debug(data.global);
							if (!data.global.loading)
								Achievements.m_mapGlobalAchievements.set(args[0], data.global);
							logger.debug(data.user);
							if (!data.user.loading)
								Achievements.m_mapMyAchievements.set(args[0], data.user);
							return;
						}
						return callOriginal;
					}
				);
			}
		});
	} else
	{
		logger.error("Could not locate Steam's Achievements module, achievement sync to the native UI is disabled");
	}

	mountManager.addPatchMount({
		patch(): Patch
		{
			return replacePatch(
				// @ts-ignore
				appStore.allApps[0].__proto__,
				"BHasStoreCategory",
				function (args)
				{
					// @ts-ignore
					if ((this as SteamAppOverview).app_type == 1073741824)
					{
						// @ts-ignore
						if (state.settings.general.store_category && state.managers.achievementManager.isReady((this as SteamAppOverview).appid) && args[0] === StoreCategory.Achievements)
						{
							return true;
						}
					}
					return callOriginal;
				}
			);
		}
	});

	function setAchievements(appid: number)
	{
		let appData = appDetailsStore.GetAppData(appid);
		if (appData && !appData.bLoadingAchievments && appData.details.achievements.nTotal === 0)
		{
			appData.bLoadingAchievments = true;
			const achievements = state.managers.achievementManager.fetchAchievements(appid);
			if (achievements.user.data)
			{
				const nAchieved = Object.keys(achievements.user.data.achieved).length;
				const nTotal = Object.keys(achievements.user.data.achieved).length + Object.keys(achievements.user.data.unachieved).length;
				const vecHighlight: SteamAppAchievement[] = [];
				Object.entries(achievements.user.data.achieved).forEach(([, value]) =>
				{
					vecHighlight.push(value);
				});
				const vecUnachieved: SteamAppAchievement[] = [];
				Object.entries(achievements.user.data.unachieved).forEach(([, value]) =>
				{
					vecUnachieved.push(value);
				});
				runInAction(() =>
				{
					appData.details.achievements = {
						nAchieved,
						nTotal,
						vecAchievedHidden: [],
						vecHighlight,
						vecUnachieved
					};
					logger.debug("achievementsCachedData", appData.details.achievements);
					appDetailsCache.SetCachedDataForApp(appid, "achievements", 2, appData.details.achievements);
				});
			}
			appData.bLoadingAchievments = false;
		}
	}

	mountManager.addPatchMount({
		patch(): Patch
		{
			return beforePatch(
				appDetailsStore,
				"GetAchievements",
				args =>
				{
					setAchievements(args[0]);
				}
			);
		}
	});

	mountManager.addPatchMount({
		patch(): Patch
		{
			return beforePatch(
				Router,
				"BIsStreamingRemotePlayTogetherGame",
				_ =>
				{
					if (state.managers.achievementManager.isReady((Router.MainRunningApp as SteamAppOverview | undefined)?.appid ?? 0))
					{
						setAchievements((Router.MainRunningApp as SteamAppOverview | undefined)?.appid ?? 0);
					}
				}
			);
		}
	});

	if (AppDetailsSections)
	{
		mountManager.addPatchMount({
			patch(): Patch
			{
				return afterPatch(AppDetailsSections.prototype, 'GetSections', function(this: any, _: Record<string, unknown>[], ret: Set<string>)
				{
					const overview: SteamAppOverview = this?.props?.overview;
					if (overview?.app_type === 1073741824)
					{
						if (state.settings.general.game_page) ret.add("achievements");
						else ret.delete("achievements");
					}
					return ret;
				});
			}
		});
	} else
	{
		logger.error("Could not locate Steam's AppDetailsSections module, the achievements tab on the game page is disabled");
	}

	mountManager.addMount({
		mount: function (): void
		{
			lifetimeHook = SteamClient.GameSessions.RegisterForAppLifetimeNotifications((update: {
				unAppID: number;
				nInstanceID: number;
				bRunning: boolean;
			}) =>
			{
				logger.debug("lifetime", update);
				if ((appStore.GetAppOverviewByAppID(update.unAppID) as SteamAppOverview).app_type == 1073741824)
				{
					if (!update.bRunning)
					{
						state.managers.achievementManager.clearRuntimeCacheForAppId(update.unAppID);
						state.managers.achievementManager.fetchAchievements(update.unAppID);
					}
				}
			});
		},
		unMount: function (): void
		{
			lifetimeHook?.unregister();
		}
	});

	mountManager.addMount(patchAppPage(state));

	mountManager.addMount({
		mount: async function (): Promise<void>
		{
			if (await checkOnlineStatus())
			{
				await state.init();
			} else
			{
				await waitForOnline();
				await state.init();
			}
		},
		unMount: async function (): Promise<void>
		{
			await state.deinit();
		}
	});

	const unregister = mountManager.register();

	//console.log(d);
	return {
		name: t("title"),
		titleView: <div className={staticClasses.Title}>{t("title")}</div>,
		content:
			<EmuchievementsStateContextProvider emuchievementsState={state}>
				<EmuchievementsComponent />
			</EmuchievementsStateContextProvider>,
		icon: <FaClipboardCheck />,
		onDismount()
		{
			routerHook.removeRoute("/emuchievements/settings");
			unregister();
		},
	};
});