import {
	callOriginal,
	definePlugin,
	findModuleChild,
	replacePatch,
	ServerAPI,
	staticClasses
} from "decky-frontend-lib";
import {FaClipboardCheck} from "react-icons/fa";
import {GameComponent} from "./components/gameComponent";
import {EmuchievementsComponent} from "./components/emuchievementsComponent";
import {LoginComponent} from "./components/loginComponent";
import {DescriptionComponent} from "./components/descriptionComponent";
import {AppDetailsStore, AppStore} from "./AppStore";
import {SteamClient} from "./SteamClient";
import {patchAppPage} from "./AppPatch";
import {AchievementManager} from "./AchievementsManager";
import Logger from "./logger";
import {hideApp, showApp} from "./steam-utils";

declare global
{
	let SteamClient: SteamClient;
	let appStore: AppStore;
	let appDetailsStore: AppDetailsStore;
}

export default definePlugin((serverAPI: ServerAPI) =>
{
	serverAPI.routerHook.addRoute("/emuchievements/game", () => <GameComponent serverAPI={serverAPI}/>);
	serverAPI.routerHook.addRoute("/emuchievements/achievement", () => <DescriptionComponent serverAPI={serverAPI}/>);
	serverAPI.routerHook.addRoute("/emuchievements/login", () => <LoginComponent serverAPI={serverAPI}/>);
	const logger = new Logger("Init");

	const achievementManager = new AchievementManager(serverAPI);
	let d = (findModuleChild(module =>
	{
		if (typeof module!=='object') return undefined;
		for (let prop in module)
		{
			if (module[prop]?.m_mapMyAchievements) return module[prop];
		}
	}));
	let myPatch = replacePatch(
			d.__proto__,
			"GetMyAchievements",
			args =>
			{
				console.log(args, appStore.GetAppOverviewByAppID(args[0]), appDetailsStore.GetAppDetails(args[0]));
				if (appStore.GetAppOverviewByAppID(args[0]).app_type==1073741824)
				{
					let data = achievementManager.fetchAchievements(serverAPI, args[0]);
					console.log(data.all);
					return data.all;
				}
				return callOriginal;
			}
	)
	let globalPatch = replacePatch(
			d.__proto__,
			"GetGlobalAchievements",
			args =>
			{
				console.log(args, appStore.GetAppOverviewByAppID(args[0]), appDetailsStore.GetAppDetails(args[0]));
				if (appStore.GetAppOverviewByAppID(args[0]).app_type==1073741824)
				{
					let data = achievementManager.fetchAchievements(serverAPI, args[0]);
					console.log(data.global);
					return data.global;

				}
				return callOriginal;
			}
	)

	let appPatch = patchAppPage(serverAPI, achievementManager);

	achievementManager.init().catch(reason => logger.error(reason)).then(() =>
	{
		SteamClient.Apps.GetAllShortcuts().then(async (shortcuts) =>
		{
			serverAPI.callPluginMethod<{}, boolean>("isHidden", {}).then(hidden =>
			{
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
						app_ids.forEach(app_id =>
						{
							hideApp(app_id);
						})
					} else
					{
						app_ids.forEach(app_id =>
						{
							showApp(app_id);
						})
					}
				}
			});
		});
	});

	console.log(d);
	return {
		title: <div className={staticClasses.Title}>Emuchievements</div>,
		content: <EmuchievementsComponent achievementManager={achievementManager} serverAPI={serverAPI}/>,
		icon: <FaClipboardCheck/>,
		onDismount()
		{
			serverAPI.routerHook.removeRoute("/emuchievements/game");
			serverAPI.routerHook.removeRoute("/emuchievements/achievement");
			serverAPI.routerHook.removeRoute("/emuchievements/login");
			serverAPI.routerHook.removePatch("/library/app/:appid", appPatch)
			myPatch.unpatch();
			globalPatch.unpatch();
			achievementManager.deinit();
		},
	};
});
