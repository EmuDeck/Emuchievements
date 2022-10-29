import {HomeProps} from "../interfaces";
import {ButtonItem, PanelSection, PanelSectionRow, Router, SteamSpinner} from "decky-frontend-lib";
import {ApiComponent} from "./apiComponent";
import {globalState} from "../state";

export class HomeComponent extends ApiComponent<HomeProps> {
    render() {
        if (!this.state.loading) {
            return (
                <PanelSection title="Games">
                    {
                        this.state.games.map(game => {
                            if (game.title && game.num_achievements && game.game_id)
                                return <PanelSectionRow>
                                    <ButtonItem onClick={() => {
                                        if (game.game_id) {
                                            Router.CloseSideMenus();
                                            globalState.current_game = game.game_id
                                            Router.Navigate("/emuchievements/game/${game.game_id}");
                                        }
                                    }}>
                                        {game.title}: <br/>
                                        Achieved {(game.num_achieved) ? game.num_achieved : 0}/{game.num_achievements}<br/>
                                        Hardcore: {(game.num_achieved_hardcore) ? game.num_achieved_hardcore : 0}/{game.num_achievements}
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