import { Field, Focusable, Navigation, ProgressBarWithInfo } from "decky-frontend-lib";
import { useEffect, useState, VFC } from "react";
// import {useTranslations} from "../useTranslations";
// import Logger from "../logger";
import { useEmuchievementsState } from "../hooks/achievementsContext";
import { AchievementsProgress } from "../AchievementsManager";

export const GameListComponent: VFC = () =>
{
	// const t = useTranslations()
	// const logger = new Logger("GameListComponent");
	const { apps, managers: { achievementManager } } = useEmuchievementsState();
	const [appIds, setAppIds] = useState<number[]>();
	const [currentGame, setCurrentGame] = useState<AchievementsProgress>();
	// @ts-ignore
	const [currentAppId, setCurrentAppId] = useState<number>();
	useEffect(() =>
	{
		apps.then(setAppIds);
	});

	return <Focusable
		style={{
			marginTop: '40px',
			marginLeft: '10px',
			marginRight: '10px',
			height: 'calc( 100% - 40px )',
			overflowY: 'auto',
			display: 'flex',
			gap: '10px',
			flexDirection: 'row',
		}}
	>
		<Focusable
			style={{
				overflowY: 'scroll',
				display: 'flex',
				flexWrap: 'wrap',
				justifyContent: 'center',
				gap: '10px',
				height: '100%',
				flex: '0 0 calc(50% - 5px)',
				flexDirection: 'row'
			}}
		>
			{appIds?.map(appId =>
			{
				// Fetch all the achievements for each appId.
				const achievements = achievementManager.fetchAchievementsProgress(appId);
				// If there are achievements, render them in a progress bar.
				if (!!achievements)
				{
					return (
						<Focusable
							style={{
								background: 'var(--main-editor-bg-color)',
								display: 'grid',
								gridTemplateRows: '130px max-content max-content',
								overflow: 'visible',
								borderRadius: 'var(--round-radius-size)',
								width: '100%'
							}}
							onActivate={() =>
							{
								Navigation.Navigate(`/library/app/${appId}/achievements/my/individual`);
								Navigation.CloseSideMenus();
							}}
							onFocus={() =>
							{
								setCurrentGame(achievements);
								setCurrentAppId(appId);
							}}
						>
							<div
								style={{
									margin: '10px',
									display: 'flex',
									flexDirection: 'row',
									gap: '10px',
								}}
							>
								<img style={{
									height: '100%',
									display: 'block',
									borderRadius: 'var(--round-radius-size)',
								}} src={achievements.data.game.imageIcon} />
								<Field
									// label={appStore.GetAppOverviewByAppID(appId).display_name}
									bottomSeparator={"none"}
									childrenContainerWidth={"max"}
								>
									<ProgressBarWithInfo
										nProgress={achievements.percentage}
										sOperationText={appStore.GetAppOverviewByAppID(appId).display_name}
										sTimeRemaining={<div style={{
											paddingRight: "10px"
										}}>{`${achievements.achieved}/${achievements.total}`}</div>}
										bottomSeparator={"none"}
									/>
								</Field>
							</div>

						</Focusable>
					);
				} else return undefined;
			})}
		</Focusable>
		<Focusable
			style={{
				marginTop: '10px',
				marginBottom: '10px',
				background: 'var(--main-editor-bg-color)',
				borderRadius: 'var(--round-radius-size)',
				height: 'calc(100% - 20px)',
				flex: '0 0 calc(50% - 5px)',
				display: 'flex',
				flexDirection: 'row'
			}}
		>
			<Field label={"Current Game"} childrenContainerWidth={"max"}>{currentGame?.data.game.imageIcon}</Field>
		</Focusable>

	</Focusable>;
};