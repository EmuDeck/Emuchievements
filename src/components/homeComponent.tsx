import {Component} from "react";
import {APIState, HomeProps} from "../interfaces";
import {getData, globalState} from "../state";
import {ButtonItem, PanelSection, PanelSectionRow, Router, SteamSpinner} from "decky-frontend-lib";

export class HomeComponent extends Component<HomeProps, APIState> {
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
            return (
                <PanelSection title="Games">
                    {
                        this.state.games.map(game => {
                            if (game.title && game.num_achieved && game.num_achievements && game.game_id)
                                return <PanelSectionRow>
                                    <ButtonItem onClick={() => {
                                        if (game.game_id) {
                                            Router.CloseSideMenus();
                                            globalState.current_game = game.game_id
                                            Router.Navigate("/emuchievements/game");
                                        }
                                    }}>
                                        {game.title}: {game.num_achieved}/{game.num_achievements}
                                    </ButtonItem>
                                </PanelSectionRow>;
                            else return undefined
                        })
                    }
                </PanelSection>
            );
        } else {
            return (
                <SteamSpinner/>
            );
        }
    }
}