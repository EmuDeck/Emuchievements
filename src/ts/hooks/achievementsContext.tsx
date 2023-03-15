import { ServerAPI } from "decky-frontend-lib";
import {createContext, FC, ReactNode, useContext, useEffect, useState} from "react";
import {AchievementManager, Manager} from "../AchievementsManager";
import {getAllNonSteamAppOverview} from "../steam-utils";
import {Promise} from "bluebird";
import Logger from "../logger";

interface LoadingData
{
	get percentage(): number
	get globalLoading(): boolean,
	set globalLoading(value: boolean),
	get currentGame(): string,
	set currentGame(value: string),
	get processed(): number,
	set processed(value: number),
     get total(): number,
	set total(value: number)
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
	refresh(): void
}

const logger = new Logger("state")
export class EmuchievementsState
{
	private _loadingData: LoadingData = new class implements LoadingData
	{
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

		private _currentGame = "fetching";
		get currentGame(): string
		{
			return this._currentGame;
		}

		set currentGame(value: string)
		{
			this._currentGame = value;
			this.state.notifyUpdate();
		}
	}(this);

	private readonly _serverAPI;

	constructor(serverAPI: ServerAPI)
	{
		this._serverAPI = serverAPI;
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
			refresh: () => this.refresh()
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
		return (async () => (await getAllNonSteamAppOverview()).map((app) => app.appid).filter((app_id) => this._managers.achievementManager.isReady(app_id)))()
	}

	get serverAPI(): ServerAPI
	{
		return this._serverAPI;
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

	private notifyUpdate(): void
	{
		logger.log(this)
		this.eventBus.dispatchEvent(new Event('update'));
	}
}

const EmuchievementsStateContext = createContext<EmuchievementsStateContext>(null as any);

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