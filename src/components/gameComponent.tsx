import {GameProps} from "../interfaces";
import {
    Focusable,
    joinClassNames,
    PanelSection,
    ProgressBarWithInfo, Router,
    scrollClasses,
    staticClasses,
    SteamSpinner
} from "decky-frontend-lib";
import {AchievementComponent} from "./achievementComponent";
import {ApiComponent} from "./apiComponent";
import {globalState} from "../state";

export class GameComponent extends ApiComponent<GameProps>
{
	render()
	{
		if (!this.state.loading)
		{
			let game = this.state.achievements[globalState.current_game]
			return game ? (
				<Focusable style={{
					marginTop: "40px",
					marginBottom: "80px",
					height: "calc( 100% - 120px )"
				}}>
					<div style={{
						backgroundImage: `url(${game.image_icon})`,
						height: "20%",
						backgroundPosition: "center",
						backgroundRepeat: "no-repeat",
						backgroundSize: "contain",
						position: "relative"
					}}>
						<h1>{game.title}</h1>
						<div style={{
							display: "flex",
							justifyContent: "left"
						}}>
							<ProgressBarWithInfo
								nProgress={(() =>
								{
									return game.num_achievements ? game.num_achieved ? (game.num_achieved / game.num_achievements) * 100.0 : 0 : 0;
								})()}
								sOperationText={`Achieved: ${(game.num_achieved) ? game.num_achieved : 0}/${(game.num_achievements) ? game.num_achievements : 0}`}
							/>
							<ProgressBarWithInfo
								nProgress={(() =>
								{
									return game.num_achievements ? game.num_achieved_hardcore ? (game.num_achieved_hardcore / game.num_achievements) * 100.0 : 0 : 0;
								})()}
								sOperationText={`Hardcore: ${(game.num_achieved_hardcore) ? game.num_achieved_hardcore : 0}/${(game.num_achievements) ? game.num_achievements : 0}`}
							/>
						</div>
					</div>
					<div
						className={joinClassNames(staticClasses.TabGroupPanel, scrollClasses.ScrollPanel, scrollClasses.ScrollY)}
						style={{
							marginTop: "40px",
							marginBottom: "80px",
							height: "calc( 100% - 120px )"
						}}
					>
						<PanelSection title="Achievements">
							{
								game.achievements ? game.achievements.map(achievement =>

									<Focusable onActivate={() =>
									{
                                        if (achievement.id)
                                        {
                                            globalState.current_achievement = achievement.id
                                            Router.Navigate("/emuchievements/achievement")
                                        }
									}}>
										<AchievementComponent achievement={achievement}/>
									</Focusable>
								) : <div/>
							}
						</PanelSection>
					</div>
				</Focusable>
			) : <div/>;

		} else
		{
			return <SteamSpinner/>
		}
	}
}