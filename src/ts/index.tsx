import {
	afterPatch, ButtonItem,
	callOriginal,
	definePlugin,
	findModuleChild, Navigation, PanelSectionRow, Patch,
	replacePatch,
	ServerAPI,
	staticClasses
} from "decky-frontend-lib";
import {FaClipboardCheck} from "react-icons/fa";
import {SettingsComponent} from "./components/settingsComponent";
import {AppDetailsStore, AppStore} from "./AppStore";
import {AppDetails, AppOverview, SteamClient, SteamShortcut} from "./SteamClient";
import {AchievementManager} from "./AchievementsManager";
import {hideApp, showApp} from "./steam-utils";
import {runInAction} from "mobx";
import {setServerAPI} from "./settings";
import {EmuchievementsComponent} from "./components/emuchievementsComponent";
import {EmuchievementsState, EmuchievementsStateContextProvider} from "./hooks/achievementsContext";

declare global
{
	// @ts-ignore
	let SteamClient: SteamClient;
	// @ts-ignore
	let appStore: AppStore;
	// @ts-ignore
	let appDetailsStore: AppDetailsStore;
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

export default definePlugin((serverAPI: ServerAPI) => {
	setServerAPI(serverAPI);
	const state = new EmuchievementsState();
	const achievementManager = new AchievementManager(serverAPI, state);
	serverAPI.routerHook.addRoute("/emuchievements/settings", () =>
		   <EmuchievementsStateContextProvider emuchievementsState={state}>
			   <SettingsComponent serverAPI={serverAPI} achievementManager={achievementManager}/>
		   </EmuchievementsStateContextProvider>
	);
	let myPatch: Patch = replacePatch(
		   Achievements.__proto__,
		   "GetMyAchievements",
		   args => {
			   //console.log(args, appStore.GetAppOverviewByAppID(args[0]), appDetailsStore.GetAppDetails(args[0]));
			   if (appStore.GetAppOverviewByAppID(args[0])?.app_type == 1073741824)
			   {
				   let data = achievementManager.fetchAchievements(args[0]);
				   //console.log(data.all);
				   return data.all;
			   }
			   return callOriginal;
		   }
	);
	let globalPatch: Patch = replacePatch(
		   Achievements.__proto__,
		   "GetGlobalAchievements",
		   args => {
			   //console.log(args, appStore.GetAppOverviewByAppID(args[0]), appDetailsStore.GetAppDetails(args[0]));
			   if (appStore.GetAppOverviewByAppID(args[0])?.app_type == 1073741824)
			   {
				   let data = achievementManager.fetchAchievements(args[0]);
				   //console.log(data.global);
				   return data.global;

			   }
			   return callOriginal;
		   }
	);
	let sectionPatch: Patch = afterPatch(AppDetailsSections.prototype, 'render', (_: Record<string, unknown>[], component: any) => {
		const overview: AppOverview = component._owner.pendingProps.overview;
		const details: AppDetails = component._owner.pendingProps.details;
		console.log(component._owner.pendingProps)
		if (overview.app_type === 1073741824)
		{
			if (achievementManager.isReady(overview.appid))
			{
				const ret = achievementManager.fetchAchievements(overview.appid);
				runInAction(() => {
					if (ret.all.data)
					{
						details.achievements.nAchieved = Object.keys(ret.all.data.achieved).length;
						details.achievements.nTotal = Object.keys(ret.all.data.achieved).length + Object.keys(ret.all.data.unachieved).length;
						details.achievements.vecHighlight = [];
						Object.entries(ret.all.data.achieved).forEach(([, value]) => {
							details.achievements.vecHighlight.push(value)
						});
						details.achievements.vecUnachieved = [];
						Object.entries(ret.all.data.unachieved).forEach(([, value]) => {
							details.achievements.vecUnachieved.push(value)
						});
						//console.log("Added achievements to ", details);
					}
				});
				console.log("proto", component._owner.type.prototype)
				afterPatch(
					   component._owner.type.prototype,
					   "GetSections",
					   (_: Record<string, unknown>[], ret3: Set<string>) => {
						   if (achievementManager.isReady(overview.appid)) ret3.add("achievements");
						   else ret3.delete("achievements");
						   return ret3;
					   }
				);

			}
		}
		return component;
	});


	achievementManager.init().then(() => {
		SteamClient.Apps.GetAllShortcuts().then(async (shortcuts: SteamShortcut[]) => {
			serverAPI.callPluginMethod<{}, boolean>("isHidden", {}).then(hidden => {
				console.log("hidden: ", hidden)
				let app_ids: number[] = [];
				for (const app_id of shortcuts.map(shortcut => shortcut.appid))
				{
					if (achievementManager.isReady(app_id))
					{
						app_ids.push(app_id)
					}
				}
				if (hidden.success)
				{
					if (hidden.result)
					{
						app_ids.forEach(app_id => {
							hideApp(app_id);
						})
					} else
					{
						app_ids.forEach(app_id => {
							showApp(app_id);
						})
					}
				}
			});
		});
	});


	//console.log(d);
	return {
		title: <div className={staticClasses.Title}>Emuchievements</div>,
		content:
			   <EmuchievementsStateContextProvider emuchievementsState={state}>
				   <PanelSectionRow>
					   <ButtonItem onClick={() => {
						   Navigation.CloseSideMenus()
						   Navigation.Navigate("/emuchievements/settings")
					   }}>
						   Settings
					   </ButtonItem>
				   </PanelSectionRow>
				   <EmuchievementsComponent achievementManager={achievementManager} serverAPI={serverAPI}/>
			   </EmuchievementsStateContextProvider>,
		icon: <FaClipboardCheck/>,
		onDismount()
		{
			serverAPI.routerHook.removeRoute("/emuchievements/settings");
			myPatch?.unpatch();
			globalPatch?.unpatch();
			sectionPatch?.unpatch();
			achievementManager.deinit();
		},
	};
});