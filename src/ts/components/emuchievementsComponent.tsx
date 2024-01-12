import {useEffect, useState, VFC} from "react";
import {
	ButtonItem,
	Field,
	Navigation,
	PanelSection,
	PanelSectionRow,
	ProgressBarItem,
	ProgressBarWithInfo
} from "decky-frontend-lib";
import {useEmuchievementsState} from "../hooks/achievementsContext";
import {FaSync} from "react-icons/fa";
import Logger from "../logger";
import {useTranslations} from "../useTranslations";

export const EmuchievementsComponent: VFC = () =>
{
	const t = useTranslations()
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
								 <ButtonItem onClick={() => {
									 Navigation.CloseSideMenus()
									 Navigation.Navigate("/emuchievements/settings")
								 }}>
									 {t("settings")}
								 </ButtonItem>
							 </PanelSectionRow>
							 <PanelSectionRow>
								 <ProgressBarWithInfo
									    label={t("loading")}
									    layout="inline"
									    bottomSeparator="none"
									    sOperationText={loadingData.game}
									    description={loadingData.description}
									    nProgress={loadingData.percentage}
									    sTimeRemaining={<div style={{
										    paddingRight: "10px"
									    }}>{!loadingData.fetching ? `${loadingData.processed}/${loadingData.total}` : ""}</div>}
									    indeterminate={loadingData.fetching}
								 />
							 </PanelSectionRow>
						 </PanelSection> : ( loadingData.errored ? 
						 <PanelSection>
							<PanelSectionRow>
								<ButtonItem onClick={() => {
									Navigation.CloseSideMenus()
									Navigation.Navigate("/emuchievements/settings")
								}}>
									{t("settings")}
								</ButtonItem>
							</PanelSectionRow>
							<PanelSectionRow>
								<ButtonItem
									onClick={() => void refresh()}
								><FaSync/> {t("refresh")}</ButtonItem>
							</PanelSectionRow>
							 <PanelSectionRow>
								 <ProgressBarWithInfo
									    label={t("loading")}
									    layout="inline"
									    bottomSeparator="none"
									    sOperationText={loadingData.game}
									    description={loadingData.description}
									    nProgress={0}
									    sTimeRemaining={<div style={{
										    paddingRight: "10px"
									    }}>{!loadingData.fetching ? `${loadingData.processed}/${loadingData.total}` : ""}</div>}
									    indeterminate={loadingData.fetching}
								 />
							 </PanelSectionRow>
						</PanelSection> :
						<PanelSection>
							<PanelSectionRow>
								<ButtonItem onClick={() => {
									Navigation.CloseSideMenus()
									Navigation.Navigate("/emuchievements/settings")
								}}>
									{t("settings")}
								</ButtonItem>
							</PanelSectionRow>
							<PanelSectionRow>
								<ButtonItem
									onClick={() => void refresh()}
								><FaSync/> {t("refresh")}</ButtonItem>
							</PanelSectionRow>
							{
								(() => {
									logger.debug(appIds);
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
										 } else return undefined;
									 });
								 })()
							 }
						 </PanelSection>));
}
