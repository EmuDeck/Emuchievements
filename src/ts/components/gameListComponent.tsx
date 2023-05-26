import {Focusable, Navigation, ProgressBarItem} from "decky-frontend-lib";
import {useEffect, useState, VFC} from "react";
// import {useTranslations} from "../useTranslations";
// import Logger from "../logger";
import {useEmuchievementsState} from "../hooks/achievementsContext";

export const GameListComponent: VFC = () => {
	// const t = useTranslations()
	// const logger = new Logger("GameListComponent");
	const {apps, managers: {achievementManager}} = useEmuchievementsState()
	const [appIds, setAppIds] = useState<number[]>()
	useEffect(() => {
		apps.then(setAppIds)
	});
	return <Focusable
		   style={{
			   marginTop: '40px',
			   height: 'calc( 100% - 40px )',
			   display: 'flex',
			   flexWrap: 'wrap',
			   justifyContent: 'center',
			   gap: '10px',
			   flexDirection: 'row'
		   }}
	>
		{appIds?.map(appId => {
			// Fetch all the achievements for each appId.
			const achievements = achievementManager.fetchAchievementsProgress(appId);
			// If there are achievements, render them in a progress bar.
			if (!!achievements)
			{
				return (
					   <Focusable
							 style={{
								 background: 'var(--main-editor-bg-color)',
								 // borderRadius: '6px',
								 display: 'grid',
								 gridTemplateRows: '130px max-content max-content',
								 overflow: 'visible',
								 width: 'fit-content',
							 }}
							 onActivate={() => {
								 Navigation.Navigate(`/library/app/${appId}/achievements/my/individual`);
								 Navigation.CloseSideMenus();
							 }}
					   >
						   <div>

							   <ProgressBarItem
									 label={appStore.GetAppOverviewByAppID(appId).display_name}
									 nProgress={achievements.percentage}
									 layout="below"
									 description={`${achievements.achieved}/${achievements.total}`}
									 bottomSeparator="none"/>
						   </div>

					   </Focusable>
				);
			} else return undefined;
		})}
	</Focusable>
}