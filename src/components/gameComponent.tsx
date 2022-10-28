import {Component} from "react";
import {APIState, GameProps} from "../interfaces";
import {getData, globalState} from "../state";
import {
    Focusable,
    joinClassNames,
    PanelSection,
    ProgressBarWithInfo,
    scrollClasses,
    staticClasses,
    SteamSpinner
} from "decky-frontend-lib";
import {AchievementComponent} from "./achievementComponent";

export class GameComponent extends Component<GameProps, APIState> {
    state: Readonly<APIState> = {
        games: [],
        achievements: {},
        loading: true
    };

    componentDidMount() {
        let {serverAPI} = this.props;
        getData(serverAPI).then(value => {
            this.setState(value)
        })
    }

    render() {
        if (!this.state.loading) {
            let game = this.state.achievements[globalState.current_game]
            return (
                <Focusable style={{
                    marginTop: "40px",
                    marginBottom: "80px",
                    height: "calc( 100% - 120px )"
                }}>
                    <section>
                        <div style={{
                            backgroundImage: `url(${game?.image_icon})`,
                            height: "50%",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "initial",
                            position: "relative"
                        }}>
                            <h1>{`${game?.title}`}</h1>
                            <div style={{
                                display: "flex",
                                justifyContent: "left"
                            }}>
                                <ProgressBarWithInfo
                                    nProgress={(() => {
                                        if (game?.num_achieved && game?.num_achievements)
                                            return (game?.num_achieved / game?.num_achievements) * 100.0
                                        else
                                            return 0
                                    })()}
                                    sOperationText={`${game?.num_achieved}/${game?.num_achievements}`}
                                />
                            </div>
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
                        <PanelSection title="Achievements">
                            {
                                game?.achievements?.map(achievement =>

                                    <Focusable onActivate={() => {
                                    }}>
                                        <AchievementComponent achievement={achievement}/>
                                    </Focusable>
                                )
                            }
                        </PanelSection>
                    </div>
                </Focusable>
            )
        } else {
            return <SteamSpinner/>
        }
    }
}