import {Component} from "react";
import {EmuchievementsProps, EmuchievementsState} from "../interfaces";
import {ButtonItem, Field, PanelSection, PanelSectionRow, Router, SteamSpinner, ToggleField} from "decky-frontend-lib";
import {hideApp, showApp} from "../steam-utils";
import {SteamShortcut} from "../SteamClient";
// import {doesGameHaveRetroAchievements} from "../state";

export class EmuchievementsComponent extends Component<EmuchievementsProps, EmuchievementsState> {
    state: Readonly<EmuchievementsState> = {
        login: false,
	    loaded: false,
	    hide: false,
	    app_ids: []
    };

    componentDidMount() {
        let {serverAPI, achievementManager} = this.props;
        serverAPI.callPluginMethod<{}, boolean>("isLogin", {}).then(logged_in =>
        {
	        if (logged_in.success)
	        {
		        this.setState({
			        login: logged_in.result
		        });
		        SteamClient.Apps.GetAllShortcuts().then(async (shortcuts: SteamShortcut[]) =>
		        {
			        let app_ids: number[] = [];
			        for (const app_id of shortcuts.map(shortcut => shortcut.appid))
			        {
				        if (achievementManager.isReady(app_id))
				        {
							console.log("true", app_id)
					        app_ids.push(app_id)
				        }
						else console.log("false", app_id)
			        }
			        console.log(app_ids)
			        this.setState({app_ids: app_ids, loaded: true});
		        });

	        }
        })
	    serverAPI.callPluginMethod<{}, boolean>("isHidden", {}).then(hidden => {
			if (hidden.success)
				this.setState({hide: hidden.result});
	    });
    }



    render() {

        if (this.state.login) {
			if (this.state.loaded)
			{
				return (
						<PanelSection>
							<PanelSectionRow>
								<Field label={"Hide Shortcuts"}>
									<ToggleField checked={this.state.hide} onChange={checked =>
									{
										this.setState({hide: checked})
										this.props.serverAPI.callPluginMethod<{hidden: boolean}, {}>("Hidden", {hidden: checked}).then(() => {});
										if (checked)
										{
											this.state.app_ids.forEach(app_id => {
												hideApp(app_id);
											})
										}
										else
										{
											this.state.app_ids.forEach(app_id => {
												showApp(app_id);
											})
										}
									}}/>
								</Field>
							</PanelSectionRow>
							{
								this.state.app_ids.map(app_id =>
										<PanelSectionRow key={app_id}>
											<ButtonItem onClick={() =>
											{
												Router.Navigate(`/library/app/${app_id}/achievements/my/individual`)
											}} layout={"below"}>
												<div style={{
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'space-between'
												}}>
													{appStore.GetAppOverviewByAppID(app_id).display_name}
												</div>
											</ButtonItem>
										</PanelSectionRow>
								)
							}
						</PanelSection>
				);
			}
			else return <SteamSpinner/>
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