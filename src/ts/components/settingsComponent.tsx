import React, {
	FunctionComponent,
	useContext,
	useRef,
	VFC
} from "react";
import
	{
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
import { hideApp, showApp } from "../steam-utils";
import { EmuchievementsStateContext } from "../hooks/achievementsContext";
import { ReactMarkdown, ReactMarkdownOptions } from "react-markdown/lib/react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "../useTranslations";

interface MarkdownProps extends ReactMarkdownOptions
{
	onDismiss?: () => void;
}

const Markdown: FunctionComponent<MarkdownProps> = (props) =>
{
	return (
		<Focusable>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					div: (nodeProps) => <Focusable {...nodeProps.node.properties}>{nodeProps.children}</Focusable>,
					a: (nodeProps) =>
					{
						const aRef = useRef<HTMLAnchorElement>(null);
						return (
							// TODO fix focus ring
							<Focusable
								onActivate={() => { }}
								onOKButton={() =>
								{
									props.onDismiss?.();
									Navigation.NavigateToExternalWeb(aRef.current!.href);
								}}
								style={{ display: 'inline' }}
							>
								<a ref={aRef} {...nodeProps.node.properties}>
									{nodeProps.children}
								</a>
							</Focusable>
						);
					},
				}}
				{...props}
			>{props.children}</ReactMarkdown>
		</Focusable>
	);
};

const GeneralSettings: VFC = () =>
{
	const t = useTranslations();
	const { serverAPI, loadingData, apps, loggedIn, login, settings } = useContext(EmuchievementsStateContext);
	return (<div style={{
		marginTop: '40px',
		height: 'calc( 100% - 40px )',
	}}>
		{loadingData.globalLoading ? <PanelSectionRow>
			<SteamSpinner />
		</PanelSectionRow> :
			<>
				<PanelSection title={t("settingsApps")}>
					<PanelSectionRow>
						<Field label={t("settingsHideShortcuts")}>
							<ToggleField checked={settings.hidden} onChange={async checked =>
							{
								settings.hidden = checked;
								await serverAPI.callPluginMethod<{ hidden: boolean; }, {}>("Hidden", { hidden: checked });
								if (checked)
								{
									(await apps)?.forEach(appId =>
									{
										hideApp(appId);
									});
								} else
								{
									(await apps)?.forEach(appId =>
									{
										showApp(appId);
									});
								}
							}} />
						</Field>
					</PanelSectionRow>
				</PanelSection>
				<PanelSection title={t("settingsRetroAchievements")}>
					<PanelSectionRow>
						<Field label={t("settingsInstructions")}>
							<Markdown>
								{t("settingsInstructionsMD")}
							</Markdown>
						</Field>
					</PanelSectionRow>
					<Focusable>
						<TextField label={t("settingsUsername")} value={settings.username}
							onChange={({ target: { value } }) => settings.username = value} />
					</Focusable>
					<Focusable>
						<TextField label={t("settingsAPIKey")} value={settings.api_key}
							onChange={({ target: { value } }) => settings.api_key = value} />
					</Focusable>
					<ButtonItem onClick={
						async () =>
						{
							await login({
								username: settings.username,
								api_key: settings.api_key,
							});
							serverAPI.toaster.toast({
								title: t("title"),
								body: await loggedIn ? t("loginSuccess") : t("loginFailed")
							});
						}}>
						Login
					</ButtonItem>
				</PanelSection>
			</>
		}
	</div>
	);
};

export const SettingsComponent: VFC = () =>
{
	const t = useTranslations();
	return <SidebarNavigation title={t("settingsTitle")} showTitle pages={[
		{
			title: t("settingsGeneral"),
			content: <GeneralSettings />,
			route: '/general',
		}
	]} />;
};