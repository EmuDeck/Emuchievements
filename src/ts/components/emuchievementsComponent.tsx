import {Fragment, useEffect, useState, VFC} from "react";
import {EmuchievementsProps} from "../interfaces";
import {
	Field, Navigation, PanelSection,
	PanelSectionRow, ProgressBarItem,
	sleep, ProgressBarWithInfo, SteamSpinner
} from "decky-frontend-lib";
import {SteamShortcut} from "../SteamClient";
import {useEmuchievementsState} from "../hooks/achievementsContext";

export async function waitForPredicate(retries: number, delay: number, predicate: () => (boolean | Promise<boolean>)): Promise<boolean>
{
	const waitImpl = async (): Promise<boolean> => {
		try
		{
			let tries = retries + 1;
			while (tries-- !== 0)
			{
				if (await predicate())
				{
					return true;
				}

				if (tries > 0)
				{
					await sleep(delay);
				}
			}
		} catch (error)
		{
			console.error(error);
		}

		return false;
	};

	return await waitImpl();
}

export const EmuchievementsComponent: VFC<EmuchievementsProps> = ({achievementManager}) => {
	const {loadingData} = useEmuchievementsState();

	const [appIds, setAppIds] = useState<number[]>([])
	const [loading, setLoading] = useState<boolean>(true)

	useEffect(() => {
		SteamClient.Apps.GetAllShortcuts().then(async (shortcuts: SteamShortcut[]) => {
			let app_ids: number[] = [];
			// await waitForPredicate(50, 1000, () => !loadingData.globalLoading);
			if (!loadingData.globalLoading)
			{
				for (const app_id of shortcuts.map(shortcut => shortcut.appid))
				{
					if (achievementManager.isReady(app_id))
					{
						app_ids.push(app_id)
					}
				}
				setAppIds(app_ids)
			}
			console.log(app_ids)
			setLoading(loadingData.globalLoading)
		})
	}, [loadingData]);

	return (
		   loading ? <PanelSection>
					 <PanelSectionRow>
						 <SteamSpinner/>
					 </PanelSectionRow>
					 <PanelSectionRow>

						 <ProgressBarWithInfo
							    nProgress={(loadingData.processed / loadingData.total) * 100}
							    label={"Loading"}
							    description={`${loadingData.processed}/${loadingData.total}`}
							    sOperationText={loadingData.currentGame}
						 />
					 </PanelSectionRow>
				 </PanelSection> :
				 <PanelSection>
					 {
						 appIds?.map(appId => {
								    const achievements = achievementManager.fetchAchievements(appId).all.data;
								    if (!!achievements)
								    {
									    const achieved = Object.keys(achievements.achieved).length;
									    const total = Object.keys(achievements.achieved).length + Object.keys(achievements.unachieved).length;
									    return <PanelSectionRow key={appId}>
										    <Field
												  label={appStore.GetAppOverviewByAppID(appId).display_name}
												  onActivate={() => {
													  Navigation.Navigate(`/library/app/${appId}/achievements/my/individual`);
													  Navigation.CloseSideMenus();
												  }}>
											    <ProgressBarItem nProgress={(achieved / total) * 100}
															 layout={"inline"}
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