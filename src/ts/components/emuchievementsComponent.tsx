import React, {useEffect, useState, VFC} from "react";
import {
	ButtonItem,
	Field,
	Navigation,
	PanelSection,
	PanelSectionRow,
	ProgressBarItem,
	ProgressBarWithInfo,
	SteamSpinner
} from "decky-frontend-lib";
import {useEmuchievementsState} from "../hooks/achievementsContext";
import {FaSync} from "react-icons/fa";
import Logger from "../logger";

export const EmuchievementsComponent: VFC = () =>
{
	const logger = new Logger("EmuchievementsComponent");
	const {apps, loadingData, managers: {achievementManager}, refresh} = useEmuchievementsState()
	const [appIds, setAppIds] = useState<number[]>()
	useEffect(() =>
	{
		apps.then(setAppIds)
	});
	return (loadingData.globalLoading ?
						 <PanelSection>
							 <PanelSectionRow>
								 <SteamSpinner/>
							 </PanelSectionRow>
							 <PanelSectionRow>
								 <ButtonItem onClick={() => {
									 Navigation.CloseSideMenus()
									 Navigation.Navigate("/emuchievements/settings")
								 }}>
									 Settings
								 </ButtonItem>
							 </PanelSectionRow>
							 <PanelSectionRow>
								 <ProgressBarWithInfo
									    nProgress={loadingData.percentage}
									    label="Loading"
									    description={`${loadingData.processed}/${loadingData.total}`}
									    sOperationText={loadingData.currentGame}
								 />
							 </PanelSectionRow>
						 </PanelSection> :
						 <PanelSection>
							 <PanelSectionRow>
								 <ButtonItem onClick={() => {
									 Navigation.CloseSideMenus()
									 Navigation.Navigate("/emuchievements/settings")
								 }}>
									 Settings
								 </ButtonItem>
							 </PanelSectionRow>
							 <PanelSectionRow>
								 <ButtonItem
									    onClick={() => void refresh()}
								 ><FaSync/> Refresh</ButtonItem>
							 </PanelSectionRow>
							 {
								 (() => {
									 logger.log(appIds);
									 return appIds?.map(appId => {
										 // Fetch all the achievements for each appId.
										 const achievements = achievementManager.fetchAchievementsProgress(appId);
										 // If there are achievements, render them in a progress bar.
										 if (!!achievements)
										 {
											 return (
												    <PanelSectionRow key={appId}>
													    <Field
															  label={appStore.GetAppOverviewByAppID(appId).display_name}
															  onActivate={() => {
																  Navigation.Navigate(`/library/app/${appId}/achievements/my/individual`);
																  Navigation.CloseSideMenus();
															  }}>
														    <ProgressBarItem
																  nProgress={achievements.percentage}
																  layout="inline"
																  description={`${achievements.achieved}/${achievements.total}`}
																  bottomSeparator="none"/>
													    </Field>
												    </PanelSectionRow>
											 );
										 } else return <></>;
									 });
								 })()
							 }
						 </PanelSection>);
}
