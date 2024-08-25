import
	{
		FC,
		useRef,
		VFC
	} from "react";
import
{
	Field,
	Focusable,
	PanelSection, PanelSectionRow,
	SidebarNavigation,
	TextField,
	ToggleField,
	Navigation
} from "decky-frontend-lib";
import { useEmuchievementsState } from "../hooks/achievementsContext";
import { ReactMarkdown, ReactMarkdownOptions } from "react-markdown/lib/react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "../useTranslations";
import { StyledButtonItem } from "./styleWrapper";

interface MarkdownProps extends ReactMarkdownOptions
{
	onDismiss?: () => void;
}

const Markdown: FC<MarkdownProps> = (props) =>
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
	const { settings } = useEmuchievementsState();
	return (<div style={{
		marginTop: '40px',
		height: 'calc( 100% - 40px )',
	}}>
		<PanelSection title={t("settingsGeneral")}>
			<PanelSectionRow>
				<ToggleField label={t("settingsGamePage")} checked={settings.general.game_page}
					onChange={async (checked) => { settings.general.game_page = checked; await settings.writeSettings(); }} />
			</PanelSectionRow>
			<PanelSectionRow>
				<ToggleField label={t("settingsStoreCategory")} checked={settings.general.store_category}
					onChange={async (checked) => { settings.general.store_category = checked; await settings.writeSettings(); }} />
			</PanelSectionRow>
		</PanelSection>
	</div>);
};

const RetroAchievementsSettings: VFC = () =>
{
	const t = useTranslations();
	const { serverAPI, loadingData, loggedIn, login, settings } = useEmuchievementsState();
	return (<div style={{
		marginTop: '40px',
		height: 'calc( 100% - 40px )',
	}}>
		<PanelSection title={t("settingsRetroAchievements")}>
			<PanelSectionRow>
				<Field label={t("settingsInstructions")}>
					<Markdown>
						{t("settingsInstructionsMD")}
					</Markdown>
				</Field>
			</PanelSectionRow>
			<PanelSectionRow>
				<TextField label={t("settingsUsername")} value={settings.retroachievements.username} disabled={loadingData.globalLoading}
					onChange={({ target: { value } }) => settings.retroachievements.username = value} />
			</PanelSectionRow>
			<PanelSectionRow>
				<TextField label={t("settingsAPIKey")} value={settings.retroachievements.api_key} bIsPassword={true} disabled={loadingData.globalLoading}
					onChange={({ target: { value } }) => settings.retroachievements.api_key = value} />
			</PanelSectionRow>
			<PanelSectionRow>
				<StyledButtonItem disabled={loadingData.globalLoading} onClick={
					async () =>
					{
						await login({
							username: settings.retroachievements.username,
							api_key: settings.retroachievements.api_key,
						});
						serverAPI.toaster.toast({
							title: t("title"),
							body: await loggedIn ? t("loginSuccess") : t("loginFailed")
						});
					}}>
					Login
				</StyledButtonItem>
			</PanelSectionRow>
		</PanelSection>
	</div>);
};

export const SettingsComponent: VFC = () =>
{
	const t = useTranslations();
	return <SidebarNavigation title={t("settingsTitle")} showTitle pages={[
		{
			title: t("settingsGeneral"),
			content: <GeneralSettings />,
		},
		{
			title: t("settingsRetroAchievements"),
			content: <RetroAchievementsSettings />,
		}
	]} />;
};