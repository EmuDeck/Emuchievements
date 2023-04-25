import {
	afterPatch,
	callOriginal,
	definePlugin,
	findModuleChild,
	Patch,
	replacePatch,
	ServerAPI,
	sleep,
	staticClasses
} from "decky-frontend-lib";
import {FaClipboardCheck} from "react-icons/fa";
import {SettingsComponent} from "./components/settingsComponent";
import {EmuchievementsComponent} from "./components/emuchievementsComponent";
import {EmuchievementsState, EmuchievementsStateContextProvider} from "./hooks/achievementsContext";
import Logger from "./logger";
import {AppDetailsStore, CollectionStore, SteamAppAchievement, SteamAppOverview} from "./SteamTypes";
import {StoreCategory} from "./interfaces";
import {EventBus, MountManager} from "./System";
import {patchAppPage} from "./RoutePatches";
import {runInAction} from "mobx";
import {getTranslateFunc} from "./useTranslations";

declare global
{
	// @ts-ignore
	let SteamClient: SteamClient;
	// @ts-ignore
	let appStore: AppStore;
	// @ts-ignore
	let appDetailsStore: AppDetailsStore;

	let appDetailsCache: any;

	let appAchievementProgressCache: any;

	let collectionStore: CollectionStore;
}

const AppDetailsSections = findModuleChild((m) => {
	if (typeof m !== 'object') return;
	for (const prop in m)
	{
		if (
			   m[prop]?.toString &&
			   m[prop].toString().includes("m_setSectionsMemo")
		) return m[prop];
	}
	return;
});

const Achievements = (findModuleChild(module => {
	if (typeof module !== 'object') return undefined;
	for (let prop in module)
	{
		if (module[prop]?.m_mapMyAchievements) return module[prop];
	}
}));

interface Hook
{
	unregister(): void
}

export default definePlugin(function (serverAPI: ServerAPI) {
	const t = getTranslateFunc()
	const logger = new Logger("Index");
	const state = new EmuchievementsState(serverAPI);
	serverAPI.routerHook.addRoute("/emuchievements/settings", () =>
		   <EmuchievementsStateContextProvider emuchievementsState={state}>
			   <SettingsComponent/>
		   </EmuchievementsStateContextProvider>
	);
	let lifetimeHook: Hook;

	const eventBus = new EventBus()
	const mountManager = new MountManager(eventBus, logger)

	const checkOnlineStatus = async () => {
		try
		{
			const online = await serverAPI.fetchNoCors<{ body: string; status: number }>("https://example.com");
			return online.success && online.result.status >= 200 && online.result.status < 300; // either true or false
		} catch (err)
		{
			return false; // definitely offline
		}
	}

	const waitForOnline = async () => {
		while (!(await checkOnlineStatus()))
		{
			logger.debug("No internet connection, retrying...");
			await sleep(1000);
		}
	}

	mountManager.addPatchMount({
		patch(): Patch
		{
			return replacePatch(
				   Achievements.__proto__,
				   "GetMyAchievements",
				   args => {
					   //console.log(args, appStore.GetAppOverviewByAppID(args[0]), appDetailsStore.GetAppDetails(args[0]));
					   if (appStore.GetAppOverviewByAppID(args[0])?.app_type == 1073741824)
					   {
						   let data = state.managers.achievementManager.fetchAchievements(args[0]);
						   //console.log(data.all);
						   return data.all;
					   }
					   return callOriginal;
				   }
			);
		}
	});

	mountManager.addPatchMount({
		patch(): Patch {
			return replacePatch(
				   Achievements.__proto__,
				   "GetGlobalAchievements",
				   args => {
					   //console.log(args, appStore.GetAppOverviewByAppID(args[0]), appDetailsStore.GetAppDetails(args[0]));
					   if (appStore.GetAppOverviewByAppID(args[0])?.app_type === 1073741824)
					   {
						   let data = state.managers.achievementManager.fetchAchievements(args[0]);
						   //console.log(data.global);
						   return data.global;

					   }
					   return callOriginal;
				   }
			);
		}
	});

	mountManager.addPatchMount({
		patch(): Patch {
			return replacePatch(
				   // @ts-ignore
				   appStore.allApps[0].__proto__,
				   "BHasStoreCategory",
				   function (args) {
					   // @ts-ignore
					   if ((this as SteamAppOverview).app_type == 1073741824)
					   {
						   // @ts-ignore
						   if (state.managers.achievementManager.isReady((this as SteamAppOverview).appid) && args[0] === StoreCategory.Achievements)
						   {
							   return true;
						   }
					   }
					   return callOriginal;
				   }
			);
		}
	});

	mountManager.addPatchMount({
		patch(): Patch {
			return replacePatch(
				   appDetailsStore,
				   "GetAchievements",
				   args => {
					   if (state.managers.achievementManager.isReady(args[0]))
					   {
						   let appData = appDetailsStore.GetAppData(args[0])
						   if (appData && !appData.bLoadingAchievments && appData.details.achievements.nTotal === 0)
						   {
							   appData.bLoadingAchievments = true;
							   const achievements = state.managers.achievementManager.fetchAchievements(args[0]);
							   if (achievements.all.data)
							   {
								   const nAchieved = Object.keys(achievements.all.data.achieved).length
								   const nTotal = Object.keys(achievements.all.data.achieved).length + Object.keys(achievements.all.data.unachieved).length
								   const vecHighlight: SteamAppAchievement[] = [];
								   Object.entries(achievements.all.data.achieved).forEach(([, value]) => {
									   vecHighlight.push(value)
								   });
								   const vecUnachieved: SteamAppAchievement[] = [];
								   Object.entries(achievements.all.data.unachieved).forEach(([, value]) => {
									   vecUnachieved.push(value)
								   });
								   runInAction(() => {
									   appData.details.achievements = {
										   nAchieved,
										   nTotal,
										   vecAchievedHidden: [],
										   vecHighlight,
										   vecUnachieved
									   };
									   appDetailsCache.SetCachedDataForApp(args[0], "achievements", 2, appData.details.achievements);
								   })
							   }
							   appData.bLoadingAchievments = false;
						   }
					   }
					   return callOriginal
				   }
			)
		}
	});

	mountManager.addPatchMount({
		patch(): Patch {
			return afterPatch(AppDetailsSections.prototype, 'render', (_: Record<string, unknown>[], component: any) => {
				const overview: SteamAppOverview = component._owner.pendingProps.overview;
				// const details: SteamAppDetails = component._owner.pendingProps.details;
				logger.debug(component._owner.pendingProps)
				if (overview.app_type === 1073741824)
				{
					if (state.managers.achievementManager.isReady(overview.appid))
					{
						// void state.managers.achievementManager.set_achievements_for_details(overview.appid, details)
						logger.debug("proto", component._owner.type.prototype)
						afterPatch(
							   component._owner.type.prototype,
							   "GetSections",
							   (_: Record<string, unknown>[], ret3: Set<string>) => {
								   if (state.managers.achievementManager.isReady(overview.appid)) ret3.add("achievements");
								   else ret3.delete("achievements");
								   logger.debug(`${overview.appid} Sections: `, ret3)
								   return ret3;
							   }
						);

					}
				}
				return component;
			});
		}
	});

	mountManager.addMount({
		mount: function (): void {
			lifetimeHook = SteamClient.GameSessions.RegisterForAppLifetimeNotifications((update: {
				unAppID: number
				nInstanceID: number
				bRunning: boolean
			}) => {
				logger.debug("lifetime", update)
				if ((appStore.GetAppOverviewByAppID(update.unAppID) as SteamAppOverview).app_type == 1073741824)
				{
					if (!update.bRunning)
					{
						state.managers.achievementManager.clearCacheForAppId(update.unAppID)
						state.managers.achievementManager.fetchAchievements(update.unAppID)
					}
				}
			});
		},
		unMount: function (): void {
			lifetimeHook?.unregister()
		}
	});

	mountManager.addMount(patchAppPage(state));

	mountManager.addMount({
		mount: async function (): Promise<void> {
			if (await checkOnlineStatus())
			{
				await state.init();
			} else
			{
				await waitForOnline();
				await state.init();
			}
		},
		unMount: async function (): Promise<void> {
			await state.deinit();
		}
	});

	const unregister = mountManager.register()

	//console.log(d);
	return {
		title: <div className={staticClasses.Title}>{t("title")}</div>,
		content:
			   <EmuchievementsStateContextProvider emuchievementsState={state}>
				   <EmuchievementsComponent/>
			   </EmuchievementsStateContextProvider>,
		icon: <FaClipboardCheck/>,
		onDismount()
		{
			serverAPI.routerHook.removeRoute("/emuchievements/settings");
			unregister();
		},
	};
});