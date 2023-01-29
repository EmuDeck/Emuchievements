import {Fragment, useEffect, VFC} from "react";
import {EmuchievementsProps} from "../interfaces";
import {
	Field, Navigation, PanelSection,
	PanelSectionRow, ProgressBarItem
} from "decky-frontend-lib";
import {SteamShortcut} from "../SteamClient";
import {wrapPromise} from "./WithSuspense";
import waitUntil, {WAIT_FOREVER} from "async-wait-until";
import {useEmuchievementsState} from "../hooks/achievementsContext";

let appIds: { read: () => number[] };

export const EmuchievementsComponent: VFC<EmuchievementsProps> = ({achievementManager}) => {
	const {loadingData} = useEmuchievementsState();

	useEffect(() => {
		appIds = wrapPromise<number[]>(
			   SteamClient.Apps.GetAllShortcuts().then(async (shortcuts: SteamShortcut[]) => {
				   let app_ids: number[] = [];
				   await waitUntil(() => !loadingData.globalLoading, {timeout: WAIT_FOREVER});
				   for (const app_id of shortcuts.map(shortcut => shortcut.appid))
				   {
					   if (achievementManager.isReady(app_id))
					   {
						   app_ids.push(app_id)
					   }
				   }
				   console.log(app_ids)
				   return app_ids
			   }))
	});
	const app_ids = appIds?.read();

		return (
			   <PanelSection>
				   {
					   app_ids?.map(app_id => {
								 const achievements = achievementManager.fetchAchievements(app_id).all.data;
								 if (!!achievements)
								 {
									 const achieved = Object.keys(achievements.achieved).length;
									 const total = Object.keys(achievements.achieved).length + Object.keys(achievements.unachieved).length;
									 return <PanelSectionRow key={app_id}>
										 <Field
											    label={appStore.GetAppOverviewByAppID(app_id).display_name}
											    onActivate={() => {
												    Navigation.Navigate(`/library/app/${app_id}/achievements/my/individual`);
												    Navigation.CloseSideMenus();
											    }}>
											 <ProgressBarItem nProgress={(achieved / total) * 100} layout={"inline"}
														   description={`${achieved}/${total}`}
														   bottomSeparator={"none"}/>
										 </Field>
									 </PanelSectionRow>;
								 } else return <Fragment/>;

							 }
					   )
				   }
			   </PanelSection>
		);
}