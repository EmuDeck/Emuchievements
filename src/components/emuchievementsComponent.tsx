import {Component} from "react";
import {EmuchievementsProps, LoginState} from "../interfaces";
import {HomeComponent} from "./homeComponent";
import {ButtonItem, PanelSection, PanelSectionRow, Router} from "decky-frontend-lib";

export class EmuchievementsComponent extends Component<EmuchievementsProps, LoginState> {
    state: Readonly<LoginState> = {
        login: false
    };

    componentDidMount() {
        let {serverAPI} = this.props;
        serverAPI.callPluginMethod<{}, boolean>("isLogin", {}).then(value => {
            if (value.success)
                this.setState({
                    login: value.result
                })
        })
    }

    render() {
        let {serverAPI} = this.props;
        if (this.state.login) {
            return <HomeComponent serverAPI={serverAPI}/>
        } else {
            return (
                <PanelSection>
                    <PanelSectionRow>
                        <ButtonItem onClick={() => {
                            Router.CloseSideMenus()
                            Router.Navigate("/emuchievements/login")
                        }}>
                            Login
                        </ButtonItem>
                    </PanelSectionRow>
                </PanelSection>
            );
        }
    }
}