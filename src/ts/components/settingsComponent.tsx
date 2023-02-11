import React, {
	useEffect,
	useState,
	VFC
} from "react";
import {Login, SettingsProps} from "../interfaces";
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
import {SteamShortcut} from "../SteamClient";
import {useEmuchievementsState} from "../hooks/achievementsContext";

const GeneralSettings: VFC<SettingsProps> = ({serverAPI, achievementManager}) => {
	const {loadingData} = useEmuchievementsState();
	const [username, setUsername] = useSetting<string>("username", "");
	const [apiKey, setApiKey] = useSetting<string>("api_key", "");
	const [hidden, setHidden] = useSetting<boolean>("hidden", false);
	const [appIds, setAppIds] = useState<number[]>([])
	const [loading, setLoading] = useState<boolean>(true)
	useEffect(() => {
			   SteamClient.Apps.GetAllShortcuts().then(async (shortcuts: SteamShortcut[]) => {
				   let app_ids: number[] = [];
				   if (!loadingData.globalLoading)
				   {
					   for (const app_id of shortcuts.map(shortcut => shortcut.appid))
					   {
						   if (achievementManager.isReady(app_id))
						   {
							   app_ids.push(app_id)
						   }
					   }
					   setAppIds(app_ids)
				   }
				   setLoading(loadingData.globalLoading)
			   })
	}, [loadingData]);
	return (
		   <div style={{
			   marginTop: '40px',
			   height: 'calc( 100% - 40px )',
		   }}>
			   {loading ? <PanelSectionRow>
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
								   appIds?.forEach(appId => {
									   hideApp(appId);
								   });
							   } else
							   {
								   appIds?.forEach(appId => {
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
	)
}

export const SettingsComponent: VFC<SettingsProps> = ({serverAPI, achievementManager}) => {
	const pages = [
		{
			title: 'General',
			content: <GeneralSettings serverAPI={serverAPI} achievementManager={achievementManager}/>,
			route: '/emuchievements/settings/general',
		}
	];
	return <SidebarNavigation title="Emuchievements Settings" showTitle pages={pages}/>;
}