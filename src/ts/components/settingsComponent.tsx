import React, {
	VFC
} from "react";
import {APIProps} from "../interfaces";
import {
	ButtonItem,
	Field,
	Focusable,
	PanelSection, PanelSectionRow,
	SidebarNavigation,
	TextField,
	ToggleField,
	SteamSpinner,
    Navigation
} from "decky-frontend-lib";
import {hideApp, showApp} from "../steam-utils";
import {EmuchievementsStateContextConsumer} from "../hooks/achievementsContext";

const GeneralSettings: VFC<APIProps> = ({serverAPI}) => {

	return (
		   <EmuchievementsStateContextConsumer>
			   {({loadingData, apps, loggedIn, login, settings}) => {
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
											 <ToggleField checked={settings.hidden} onChange={async checked => {
												 settings.hidden = checked
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
									 <PanelSectionRow>
										 <Field label={"Instructions"}>
											 To get your api key, go to <Focusable onActivate={() => {Navigation.NavigateToExternalWeb("https://retroachievements.org/controlpanel.php")}}><a href="https://retroachievements.org/controlpanel.php">https://retroachievements.org/controlpanel.php</a></Focusable> and log in to your account. you should see your api key in one of the entries in that page. either type it out in the api key box below or go to desktop mode and start steam in big picture mode so that you have access to the clipboard and paste it in.
										 </Field>
									 </PanelSectionRow>
									 <Focusable>
										 <TextField label="Username: " value={settings.username}
												  onChange={e => settings.username = e?.target?.value}/>
									 </Focusable>
									 <Focusable>
										 <TextField label="Api Key: " value={settings.api_key}
												  onChange={e => settings.api_key = e?.target?.value}/>
									 </Focusable>
									 <ButtonItem onClick={
										 async () => {
											 await login({
												 username: settings.username,
												 api_key: settings.api_key,
											 })
											 serverAPI.toaster.toast({
												 title: "Emuchievements",
												 body: `Login ${await loggedIn ? "Success" : "Failed"}`
											 })
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