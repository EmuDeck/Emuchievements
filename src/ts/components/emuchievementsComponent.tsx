import { CSSProperties, useEffect, useState, VFC } from "react";
import
{
	Field,
	Navigation,
	PanelSection,
	PanelSectionRow,
	ProgressBarItem,
	ProgressBarWithInfo
} from "decky-frontend-lib";
import { useEmuchievementsState } from "../hooks/achievementsContext";
import { FaCog, FaSync, FaTrash } from "react-icons/fa";
import { useTranslations } from "../useTranslations";
import React from "react";
import { StyledButtonItem } from "./styleWrapper";

export const SettingsButton: VFC = () =>
{
	const t = useTranslations();

	return (
		<StyledButtonItem onClick={() =>
		{
			Navigation.CloseSideMenus();
			Navigation.Navigate("/emuchievements/settings");
		}}
		>
			<FaCog />
			{t("settings")}
		</StyledButtonItem>
	);
};

export const RefreshButton: VFC = () =>
{
	const t = useTranslations();
	const { refresh } = useEmuchievementsState();

	return (
		<StyledButtonItem onClick={() => 
		{
			void refresh();
		}}
		>
			<FaSync />
			{t("refresh")}
		</StyledButtonItem>
	);
};

export const CacheButton: VFC = () =>
{
	const t = useTranslations();
	const { managers: { achievementManager } } = useEmuchievementsState();

	return (
		<StyledButtonItem onClick={() => 
		{
			achievementManager.clearCache();
			void achievementManager.saveCache();
		}}
		>
			<FaTrash />
			{t("clear")}
		</StyledButtonItem>
	);
};

export const LoadingProgressBar: VFC = () =>
{
	const t = useTranslations();
	const { loadingData } = useEmuchievementsState();
	const [css, setCss] = useState<CSSProperties>();
	useEffect(() =>
	{
		const def: CSSProperties = {
			marginLeft: "20px"
		};
		if (loadingData.errored) 
		{
			def.color = "red";
		}
		setCss(def);
	}, [loadingData]);
	return (
		<ProgressBarWithInfo
			label={t("loading")}
			layout="inline"
			bottomSeparator="none"
			sOperationText={loadingData.game}
			description={
				<div style={css} className="ProgressBarDescription_debug">
					{(loadingData.errored) ? <>{t("error")}<br /></> : undefined}
					{loadingData.description}
				</div>}
			nProgress={loadingData.percentage}
			sTimeRemaining={!loadingData.fetching ? `${loadingData.processed}/${loadingData.total}` : ""}
			indeterminate={loadingData.fetching}
		/>
	);
};

export const GameList: VFC = () =>
{
	const { apps, managers: { achievementManager } } = useEmuchievementsState();
	const [appIds, setAppIds] = useState<number[]>();
	useEffect(() =>
	{
		apps.then(setAppIds);
	});

	return <>{appIds?.map(appId =>
	{
		// Fetch all the achievements for each appId.
		const achievements = achievementManager.fetchAchievementsProgress(appId);
		// If there are achievements, render them in a progress bar.
		if (!!achievements)
		{
			return (
				<PanelSectionRow key={appId}>
					<Field
						label={appStore.GetAppOverviewByAppID(appId).display_name}
						onActivate={() =>
						{
							Navigation.Navigate(`/library/app/${appId}/achievements/my/individual`);
							Navigation.CloseSideMenus();
						}}>
						<ProgressBarItem
							nProgress={achievements.percentage}
							layout="inline"
							description={`${achievements.achieved}/${achievements.total}`}
							bottomSeparator="none" />
					</Field>
				</PanelSectionRow>
			);
		} else return undefined;
	})}</>;
};

export const EmuchievementsComponent: VFC = () =>
{
	const { loadingData } = useEmuchievementsState();

	return (
		loadingData.globalLoading ?
			<PanelSection>
				<PanelSectionRow>
					<SettingsButton />
				</PanelSectionRow>
				<PanelSectionRow>
					<LoadingProgressBar />
				</PanelSectionRow>
			</PanelSection> : (loadingData.errored ?
				<PanelSection>
					<PanelSectionRow>
						<SettingsButton />
					</PanelSectionRow>
					<PanelSectionRow>
						<RefreshButton />
					</PanelSectionRow>
					<PanelSectionRow>
						<CacheButton />
					</PanelSectionRow>
					<PanelSectionRow>
						<LoadingProgressBar />
					</PanelSectionRow>
				</PanelSection> :
				<PanelSection>
					<PanelSectionRow>
						<SettingsButton />
					</PanelSectionRow>
					<PanelSectionRow>
						<RefreshButton />
					</PanelSectionRow>
					<PanelSectionRow>
						<CacheButton />
					</PanelSectionRow>
					<GameList />
				</PanelSection>)
	);
};