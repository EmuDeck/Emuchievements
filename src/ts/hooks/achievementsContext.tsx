import {ServerAPI} from "decky-frontend-lib";
import {createContext, FC, ReactNode, useContext, useEffect, useState} from "react";
import {AchievementManager, Manager} from "../AchievementsManager";
import {getAllNonSteamAppIds} from "../steam-utils";
import {Promise} from "bluebird";
import {Login} from "../interfaces";
import {Settings} from "../settings";
import {getTranslateFunc} from "../useTranslations";

interface LoadingData
{
	get percentage(): number
	get globalLoading(): boolean,
	set globalLoading(value: boolean),
	get game(): string,
	set game(value: string),
	get description(): string,
	set description(value: string),
	get processed(): number,
	set processed(value: number),
     get total(): number,
	set total(value: number),
	get fetching(): boolean,
	set fetching(value: boolean)
}

interface Managers
{
	achievementManager: AchievementManager
}

interface EmuchievementsStateContext
{
	loadingData: LoadingData,
	managers: Managers,
	apps: Promise<number[]>,
	serverAPI: ServerAPI,
	settings: Settings,
	loggedIn: Promise<boolean>,
	refresh(): Promise<void>,
	login(login: Login): Promise<void>
}


export class EmuchievementsState
{
	private _loadingData: LoadingData = new class implements LoadingData
	{
		private t = getTranslateFunc()
		private state: EmuchievementsState;

		constructor(outer: EmuchievementsState)
		{
			this.state = outer;
		}

		get percentage(): number
		{
			return (this.processed / this.total) * 100;
		}

		private _globalLoading = false;

		get globalLoading(): boolean
		{
			return this._globalLoading;
		}

		set globalLoading(value: boolean)
		{
			this._globalLoading = value;
			this.state.notifyUpdate();
		}

		private _total =  0;
		get total(): number
		{
			return this._total;
		}

		set total(value: number)
		{
			this._total = value;
			this.state.notifyUpdate();
		}

		private _processed = 0;
		get processed(): number
		{
			return this._processed;
		}

		set processed(value: number)
		{
			this._processed = value;
			this.state.notifyUpdate();
		}

		private _game = this.t("fetching");
		get game(): string
		{
			return this._game;
		}

		set game(value: string)
		{
			this._game = value;
			this.state.notifyUpdate();
		}

		private _description = "";
		get description(): string
		{
			return this._description;
		}

		set description(value: string)
		{
			this._description = value;
			this.state.notifyUpdate();
		}

		private _fetching =  true;
		get fetching(): boolean
		{
			return this._fetching;
		}

		set fetching(value: boolean)
		{
			this._fetching = value;
			this.state.notifyUpdate();
		}
	}(this);

	private readonly _serverAPI;
	private readonly _settings;

	constructor(serverAPI: ServerAPI)
	{
		this._serverAPI = serverAPI;
		this._settings = new Settings(serverAPI, this);
	}

	private readonly _managers: Managers = {
		achievementManager: new AchievementManager(this)
	}

	public eventBus = new EventTarget();

	get state(): EmuchievementsStateContext
	{
		return {
			loadingData: this.loadingData,
			managers: this.managers,
			apps: this.apps,
			serverAPI: this.serverAPI,
			settings: this.settings,
			loggedIn: this.loggedIn,
			refresh: () => this.refresh(),
			login: (login: Login) => this.login(login)
		};
	}

	get managers(): Managers
	{
		return this._managers;
	}

	get loadingData(): LoadingData
	{
		return this._loadingData;
	}

	get apps(): Promise<number[]>
	{
		return (async () => (await getAllNonSteamAppIds()).filter((appId) => this._managers.achievementManager.isReady(appId)))();
	}

	get serverAPI(): ServerAPI
	{
		return this._serverAPI;
	}

	get settings(): Settings
     {
		return this._settings;
	}

	get loggedIn(): Promise<boolean>
	{
		return (async () => {
			const authenticated = await this.serverAPI.fetchNoCors<{ body: string; status: number }>(`https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php?z=${this.settings.username}&y=${this.settings.api_key}`)
			if (authenticated.success)
			{
				return authenticated.result.status === 200 && authenticated.result.body !== "Invalid API Key";
			}
			return false;
		})();
	}

	async init(): Promise<void>
	{
		Promise.map(Object.values(this._managers), (async (manager: Manager) => {
			await manager.init()
		})).then(() => {
			this.notifyUpdate();
		});
	}

	async deinit(): Promise<void>
	{
		Promise.map(Object.values(this._managers), (async (manager: Manager) => {
			await manager.deinit()
		})).then(() => {
			this.notifyUpdate();
		});

	}

	async refresh(): Promise<void>
	{
		Promise.map(Object.values(this._managers), (async (manager: Manager) => {
			await manager.refresh()
		})).then(() => {
			this.notifyUpdate();
		});
	}

	async login({username, api_key}: Login): Promise<void>
	{
		this.settings.username = username
		this.settings.api_key = api_key
	}

	notifyUpdate(): void
	{
		this.eventBus.dispatchEvent(new Event('update'));
	}
}

export const EmuchievementsStateContext = createContext<EmuchievementsStateContext>(null as any);

export const useEmuchievementsState = () => useContext(EmuchievementsStateContext);

interface Props
{
	emuchievementsState: EmuchievementsState;
}

export const EmuchievementsStateContextProvider: FC<Props> = ({children, emuchievementsState}) => {
	const [publicEmuchievementsState, setPublicEmuchievementsState] = useState<EmuchievementsStateContext>({...emuchievementsState.state});

	useEffect(() => {
		function onUpdate()
		{
			setPublicEmuchievementsState({...emuchievementsState.state});
		}

		emuchievementsState.eventBus.addEventListener('update', onUpdate);

		return () => emuchievementsState.eventBus.removeEventListener('update', onUpdate);
	}, []);


	return (
		   <EmuchievementsStateContext.Provider
				 value={{...publicEmuchievementsState}}
		   >
			   {children}
		   </EmuchievementsStateContext.Provider>
	);
};

export const EmuchievementsStateContextConsumer: FC<{children: (value: EmuchievementsStateContext) => ReactNode}> = ({children}) => {
	return <EmuchievementsStateContext.Consumer>
		{children}
	</EmuchievementsStateContext.Consumer>
}