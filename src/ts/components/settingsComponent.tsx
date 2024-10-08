import
	{
		ChangeEvent,
		FC,
		useEffect,
		useRef,
		useState,
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
	Navigation,
	Dropdown,
	ButtonItem,
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
				<ToggleField
					label={t("settingsGamePage")}
					checked={settings.general.game_page}
					onChange={async (checked) => {
						settings.general.game_page = checked;
						await settings.writeSettings();
					}}
				/>
			</PanelSectionRow>

			<PanelSectionRow>
				<ToggleField
					label={t("settingsStoreCategory")}
					checked={settings.general.store_category}
					onChange={async (checked) => {
						settings.general.store_category = checked;
						await settings.writeSettings();
					}}
				/>
			</PanelSectionRow>

			<PanelSectionRow>
				<ToggleField
					label={t("settingsShowAchievementsPrefixes")}
					checked={settings.general.show_achieved_state_prefixes ?? true}
					onChange={async (checked) => {
						settings.general.show_achieved_state_prefixes = checked;
						await settings.writeSettings();
					}}
					description={t('settingsShowAchievementsPrefixesDescription')}
				/>
			</PanelSectionRow>
		</PanelSection>
	</div>);
};

const RetroAchievementsSettings: VFC = () =>
{
	const t = useTranslations();
	const { serverAPI, loadingData, loggedIn, login, settings } = useEmuchievementsState();
	const [loginData , setLoginData] = useState({
		username: '',
		api_key: '',
	});

	const onInputChange = (event: ChangeEvent<HTMLInputElement>, inputName: 'username' | 'api_key') => {
		setLoginData((value) => ({
			...value,
			[inputName]: event.target.value,
		}));
	}

	useEffect(() => {
		setLoginData({
			username: settings.retroachievements.username,
			api_key: settings.retroachievements.api_key
		})
	}, []);

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
				<TextField
					label={t("settingsUsername")}
					value={loginData.username}
					disabled={loadingData.globalLoading}
					onChange={(event) => onInputChange(event, 'username')}
				/>
			</PanelSectionRow>

			<PanelSectionRow>
				<TextField
					label={t("settingsAPIKey")}
					value={loginData.api_key}
					bIsPassword={true}
					disabled={loadingData.globalLoading}
					onChange={(event) => onInputChange(event, 'api_key')}
				/>
			</PanelSectionRow>

			<PanelSectionRow>
				<StyledButtonItem disabled={loadingData.globalLoading} onClick={
					async () =>
					{
						const { username, api_key } = loginData;

						await login({
							username,
							api_key,
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

const CustomIdsOverrides: VFC = () => {
	type TableRowsProps = {
		appId: string | undefined | null;
		retroAchievementAppId: string | undefined;
	}

	const [tableRows, setTableRows] = useState<TableRowsProps[]>([])
	const emuchievementsState = useEmuchievementsState();
	const onChangeRetroAchievementsId = (index: number, appId: string) => {
		const newRows = [...tableRows]
		newRows[index].retroAchievementAppId = appId;

		setTableRows(newRows);
	}

	const onGameChange = (index: number, appId: string) => {
		const newRows = [...tableRows];
		newRows[index].appId = appId;

		setTableRows(newRows);
	}

	const { custom_ids_overrides }= emuchievementsState.settings.data.cache;
	const gameOptions = Object.keys(custom_ids_overrides)
		.map((item) => {
			const idAsNumber = Number.parseInt(item, 10);
			const currentApp = custom_ids_overrides[idAsNumber];

			return {
				data: item,
				appId: item,
				retroAchievementAppId: currentApp.retro_achivement_game_id,
				label: currentApp.name ?? item,
			}
		}).sort((a, b) => a.label.localeCompare(b.label));

	useEffect(() => {
		setTableRows([
			...gameOptions
				.filter((option) => option.retroAchievementAppId)
				.map((item) => ({
					appId: `${item.appId}`,
					retroAchievementAppId: `${item.retroAchievementAppId}`
				})),
			{
				appId: undefined,
				retroAchievementAppId: undefined,
			},
		])
	}, [])

	const save = async () => {
		const appsToAdd = tableRows.filter((row) => row.appId);

		for (const app of appsToAdd) {
			const { appId, retroAchievementAppId } = app;

			if (!appId) {
				continue
			}

			const appIdAsNumber = Number.parseInt(appId, 10);

			if (!retroAchievementAppId) {
				emuchievementsState.settings.data.cache.custom_ids_overrides[appIdAsNumber] = {
					...emuchievementsState.settings.data.cache.custom_ids_overrides[appIdAsNumber],
					retro_achivement_game_id: null,
					hash: null,
				}

				continue;
			}

			const retroAchievementAppIdAsNumber = Number.parseInt(retroAchievementAppId, 10);

			if (Number.isNaN(retroAchievementAppIdAsNumber) || retroAchievementAppIdAsNumber <= 0) {
				emuchievementsState.settings.data.cache.custom_ids_overrides[appIdAsNumber] = {
					...emuchievementsState.settings.data.cache.custom_ids_overrides[appIdAsNumber],
					retro_achivement_game_id: null,
					hash: null,
				}

				continue
			}

			emuchievementsState.settings.data.cache.custom_ids_overrides[appIdAsNumber] = {
				...emuchievementsState.settings.data.cache.custom_ids_overrides[appIdAsNumber],
				retro_achivement_game_id: Number.parseInt(retroAchievementAppId),
			};
		}

		await emuchievementsState.settings.writeSettings();
	}

	const addRow = () => {
		setTableRows([...tableRows, {
			appId: undefined,
			retroAchievementAppId: undefined,
		}]);
	}

	const t = useTranslations();

	return (
		<div style={{
			marginTop: '40px',
			height: 'calc(100% - 40px)',
		}}>
			<ButtonItem layout="below" onClick={() => save()}>
				{ t('settingsCustomIdsOverridesSave')}
			</ButtonItem>

			<PanelSection>
				<div style={{overflow: 'scroll',height: '100%',}}>
					<div
						className="header-row"
						style={{ gridTemplateColumns: '75% 25%', display: 'grid'}}
					>
						<div style={{padding: '10px 10px',textAlign: 'center',fontWeight: 600}}>
							Game
						</div>

						<div style={{padding: '10px 10px',textAlign: 'center',fontWeight: 600}}>
							RA Id
						</div>
					</div>
				</div>

				{tableRows.map((row, idx) => (
					<Focusable
						key={row.appId}
						flow-children="horizontal"
						style={{
							gridTemplateColumns: '75% 25%',
							padding: '10px 10px 10px 0px',textAlign: 'center',display: 'grid',
						}}
					>
						<Dropdown
							rgOptions={gameOptions}
							selectedOption={row.appId}
							onChange={(e) => onGameChange(idx, e.data)}
						/>

						<TextField
							style={{ marginLeft: '1rem'}}
							mustBeNumeric
							defaultValue={row.retroAchievementAppId}
							onChange={(e) =>
								onChangeRetroAchievementsId(idx, e.target.value)
							}
						/>
					</Focusable>
				))}

				<ButtonItem layout="below" onClick={() => addRow()}>
					{ t('settingsCustomIdsOverridesAddRow')}
				</ButtonItem>
			</PanelSection>
		</div>
	);
}

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
		},
		{
			title: t("settingsCustomIdsOverrides"),
			content: <CustomIdsOverrides />,
		}
	]} />;
};
