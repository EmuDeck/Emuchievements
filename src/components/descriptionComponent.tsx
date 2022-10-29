import {DescriptionProps} from "../interfaces";
import {ApiComponent} from "./apiComponent";
import {
    Focusable,
    joinClassNames,
    PanelSection, scrollClasses,
    staticClasses, SteamSpinner
} from "decky-frontend-lib";
import {globalState} from "../state";

export class DescriptionComponent extends ApiComponent<DescriptionProps> {
    render() {
        if (!this.state.loading) {
            let game = this.state.achievements[globalState.current_game]
            let achievement = game.achievements ? game.achievements.find(value => value.id == globalState.current_achievement) : undefined
            return game ? achievement ? (
                <Focusable style={{
                    marginTop: "40px",
                    marginBottom: "80px",
                    height: "calc( 100% - 120px )"
                }}>
                    <section>
                        <div style={{
                            backgroundImage: `url(https://media.retroachievements.org/Badge/${achievement.badge_name}.png)`,
                            height: "20%",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "contain",
                            position: "relative"
                        }}>
                            <h1>{achievement.title}</h1>
                            <h4>{achievement.description}</h4>
                        </div>
                    </section>
                    <div
                        className={joinClassNames(staticClasses.TabGroupPanel, scrollClasses.ScrollPanel, scrollClasses.ScrollY)}
                        style={{
                            marginTop: "40px",
                            marginBottom: "80px",
                            height: "calc( 100% - 120px )"
                        }}
                    >
                        <PanelSection title="Achievement Stats">
                            <Focusable onActivate={() => {
                            }}>
                                Points: {achievement.points}
                            </Focusable>
                            <Focusable onActivate={() => {
                            }}>
                                Author: {achievement.author}
                            </Focusable>
                            <Focusable onActivate={() => {
                            }}>
                                Date Awarded: {achievement.date_awarded ? achievement.date_awarded : "Not Awarded"}
                            </Focusable>
                            <Focusable onActivate={() => {
                            }}>
                                Date Awarded Hardcore: {achievement.date_awarded ? achievement.date_awarded_hardcore : "Not Awarded"}
                            </Focusable>
                        </PanelSection>
                    </div>
                </Focusable>
            ) : <div/> : <div/>;

        } else {
            return <SteamSpinner/>
        }
    }
}