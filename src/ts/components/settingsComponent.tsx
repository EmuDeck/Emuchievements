import {useEffect, VFC} from "react";
import {Login, SettingsProps} from "../interfaces";
import {
	ButtonItem,
	Field,
	Focusable,
	Navigation,
	PanelSection, PanelSectionRow,
	SidebarNavigation,
	TextField,
	ToggleField
} from "decky-frontend-lib";
import {useSetting} from "../hooks/useSetting";
import {hideApp, showApp} from "../steam-utils";
import {wrapPromise} from "./WithSuspense";
import {SteamShortcut} from "../SteamClient";
import waitUntil, {WAIT_FOREVER} from "async-wait-until";
import {useEmuchievementsState} from "../hooks/achievementsContext";

let appIds: { read: () => number[] };

const GeneralSettings: VFC<SettingsProps> = ({serverAPI, achievementManager}) => {
	const {loadingData} = useEmuchievementsState();
	const [username, setUsername] = useSetting<string>("username", "");
	const [apiKey, setApiKey] = useSetting<string>("api_key", "");
	const [hidden, setHidden] = useSetting<boolean>("hidden", false);
	useEffect(() => {
		appIds = wrapPromise<number[]>(
			   SteamClient.Apps.GetAllShortcuts().then(async (shortcuts: SteamShortcut[]) => {
				   let app_ids: number[] = [];
				   await waitUntil(() => !loadingData.globalLoading, {timeout: WAIT_FOREVER});
				   for (const app_id of shortcuts.map(shortcut => shortcut.appid))
				   {
					   if (achievementManager.isReady(app_id))
					   {
						   app_ids.push(app_id)
					   }
				   }
				   console.log(app_ids)
				   return app_ids
			   }))
	});
	const app_ids = appIds?.read();
	return (
		   <Focusable style={{
			   marginTop: '40px',
			   height: 'calc( 100% - 40px )',
		   }}>
			   <PanelSection title="Apps">
				   <PanelSectionRow>
					   <Field label={"Hide Shortcuts"}>
						   <ToggleField checked={hidden} onChange={async checked => {
							   await setHidden((checked))
							   await serverAPI.callPluginMethod<{ hidden: boolean }, {}>("Hidden", {hidden: checked})
							   if (checked)
							   {
								   app_ids?.forEach(app_id => {
									   hideApp(app_id);
								   });
							   } else
							   {
								   app_ids?.forEach(app_id => {
									   showApp(app_id);
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
		   </Focusable>
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