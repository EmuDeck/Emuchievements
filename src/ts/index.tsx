import {
	afterPatch, callOriginal,
	definePlugin,
	findModuleChild, Patch,
	replacePatch,
	ServerAPI,
	staticClasses
} from "decky-frontend-lib";
import {FaClipboardCheck} from "react-icons/fa";
import {SettingsComponent} from "./components/settingsComponent";
import {EmuchievementsComponent} from "./components/emuchievementsComponent";
import {EmuchievementsState, EmuchievementsStateContextProvider} from "./hooks/achievementsContext";
import {registerForLoginStateChange, waitForServicesInitialized} from "./LibraryInitializer";
import Logger from "./logger";
import {CollectionStore, AppDetailsStore, SteamAppOverview, SteamAppDetails} from "./SteamTypes";

declare global
{
	// @ts-ignore
	let SteamClient: SteamClient;
	// @ts-ignore
	let appStore: AppStore;
	// @ts-ignore
	let appDetailsStore: AppDetailsStore;

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

export default definePlugin(function (serverAPI: ServerAPI) {
	const logger = new Logger("Index");
	const state = new EmuchievementsState(serverAPI);
	serverAPI.routerHook.addRoute("/emuchievements/settings", () =>
		   <EmuchievementsStateContextProvider emuchievementsState={state}>
			   <SettingsComponent/>
		   </EmuchievementsStateContextProvider>
	);
	let myPatch: Patch;
	let globalPatch: Patch;
	let sectionPatch: Patch;

	const unregister = registerForLoginStateChange(
		   function (username) {
			   (async function () {
				   if (await waitForServicesInitialized())
				   {
					   logger.log(`Initializing plugin for ${username}`);
					   myPatch = replacePatch(
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
					   globalPatch = replacePatch(
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
					   sectionPatch = afterPatch(AppDetailsSections.prototype, 'render', (_: Record<string, unknown>[], component: any) => {
						   const overview: SteamAppOverview = component._owner.pendingProps.overview;
						   const details: SteamAppDetails = component._owner.pendingProps.details;
						   console.debug(component._owner.pendingProps)
						   if (overview.app_type === 1073741824)
						   {
							   if (state.managers.achievementManager.isReady(overview.appid))
							   {
								   void state.managers.achievementManager.set_achievements_for_details(overview.appid, details)
								   console.debug("proto", component._owner.type.prototype)
								   afterPatch(
										 component._owner.type.prototype,
										 "GetSections",
										 (_: Record<string, unknown>[], ret3: Set<string>) => {
											 if (state.managers.achievementManager.isReady(overview.appid)) ret3.add("achievements");
											 else ret3.delete("achievements");
											 return ret3;
										 }
								   );

							   }
						   }
						   return component;
					   });
					   await state.init();
				   }
			   })().catch(err => logger.error("Error while initializing plugin", err));
		   },
		   function () {
			   {
				   (async function () {
					   logger.log("Deinitializing plugin");
					   myPatch?.unpatch();
					   globalPatch?.unpatch();
					   sectionPatch?.unpatch();
					   await state.deinit();
				   })().catch(err => logger.error("Error while deinitializing plugin", err));
			   }
		   }
	);


	//console.log(d);
	return {
		title: <div className={staticClasses.Title}>Emuchievements</div>,
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