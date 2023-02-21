import React, {
	VFC
} from "react";
import {APIProps, Login} from "../interfaces";
import {
	ButtonItem,
	Field,
	Focusable,
	Navigation,
	PanelSection, PanelSectionRow,
	SidebarNavigation,
	TextField,
	ToggleField,
	SteamSpinner
} from "decky-frontend-lib";
import {useSetting} from "../hooks/useSetting";
import {hideApp, showApp} from "../steam-utils";
import {EmuchievementsStateContextConsumer} from "../hooks/achievementsContext";

const GeneralSettings: VFC<APIProps> = ({serverAPI}) => {
	const [username, setUsername] = useSetting<string>("username", "", serverAPI);
	const [apiKey, setApiKey] = useSetting<string>("api_key", "", serverAPI);
	const [hidden, setHidden] = useSetting<boolean>("hidden", false, serverAPI);
	return (
		   <EmuchievementsStateContextConsumer>
			   {({loadingData, apps}) => {
				   return <div style={{
					   marginTop: '40px',
					   height: 'calc( 100% - 40px )',
				   }}>
					   {loadingData.globalLoading ? <PanelSectionRow>
								 <SteamSpinner/>
							 </PanelSectionRow> :
							 <>
								 <PanelSection title="Apps">
									 <PanelSectionRow>
										 <Field label={"Hide Shortcuts"}>
											 <ToggleField checked={hidden} onChange={async checked => {
												 await setHidden((checked))
												 await serverAPI.callPluginMethod<{ hidden: boolean }, {}>("Hidden", {hidden: checked})
												 if (checked)
												 {
													 (await apps)?.forEach(appId => {
														 hideApp(appId);
													 });
												 } else
												 {
													 (await apps)?.forEach(appId => {
														 showApp(appId);
													 });
												 }
											 }}/>
										 </Field>
									 </PanelSectionRow>
								 </PanelSection>
								 <PanelSection title="RetroAchievements Login: ">
									 <Focusable>
										 <TextField label="Username: " value={username}
												  onChange={e => setUsername(e?.target?.value)}/>
									 </Focusable>
									 <Focusable>
										 <TextField label="Api Key: " value={apiKey}
												  onChange={e => setApiKey(e?.target?.value)}/>
									 </Focusable>
									 <ButtonItem onClick={
										 async () => {
											 await serverAPI.callPluginMethod<Login, {}>("Login", {
												 username: username,
												 api_key: apiKey
											 });
											 Navigation.NavigateBack();
										 }}>
										 Login
									 </ButtonItem>
								 </PanelSection>
							 </>
					   }
				   </div>
			   }}
		   </EmuchievementsStateContextConsumer>
	)
}

export const SettingsComponent: VFC = () => {
	return <EmuchievementsStateContextConsumer>
		{({serverAPI}) =>
			   <SidebarNavigation title="Emuchievements Settings" showTitle pages={[
				   {
					   title: 'General',
					   content: <GeneralSettings serverAPI={serverAPI} />,
					   route: '/emuchievements/settings/general',
				   }
			   ]}/>}
	</EmuchievementsStateContextConsumer>;
}