import {Component} from "react";
import {Login, LoginProps} from "../interfaces";
import {ButtonItem, Focusable, PanelSection, Router, TextField} from "decky-frontend-lib";

export class LoginComponent extends Component<LoginProps, Login> {
    state: Readonly<Login> = {
        username: "",
        api_key: ""
    };

    render() {
        let {serverAPI} = this.props;
        return (
            <Focusable style={{
                marginTop: '40px',
                height: 'calc( 100% - 40px )',
            }}>
                <PanelSection title="RetroAchievements Login: ">
                    <Focusable>
                        <TextField label="Username: " value={this.state.username} onChange={e => this.setState({ username: e?.target?.value })}/>
                    </Focusable>
                    <Focusable>
                        <TextField label="Api Key: " value={this.state.api_key} onChange={e => this.setState({ api_key: e?.target?.value })}/>
                    </Focusable>
                    <ButtonItem onClick={() => {
                        (async () => {
                            await serverAPI.callPluginMethod<Login, {}>("Login", {
                                username: this.state.username,
                                api_key: this.state.api_key
                            })
                            Router.NavigateBackOrOpenMenu()
                        })();
                    }}>
                    </ButtonItem>
                </PanelSection>
            </Focusable>
        )
    }
}