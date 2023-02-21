import { ServerAPI } from "decky-frontend-lib";
import {createContext, FC, ReactNode, useContext, useEffect, useState} from "react";
import {AchievementManager, Manager} from "../AchievementsManager";
import {getAllNonSteamAppOverview} from "../steam-utils";
import {Promise} from "bluebird";
import Logger from "../logger";

interface LoadingData
{
	globalLoading: boolean,
	currentGame: string,
	processed: number,
	total: number,
	get percentage(): number
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
	private _loadingData: LoadingData = {
		get percentage(): number
		{
			return (this.processed / this.total) * 100;
		},
		globalLoading: false,
		total: 0,
		processed: 0,
		currentGame: "fetching"
	};
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
			refresh: () => void this.refresh()
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

	set loadingData(loadingData: LoadingData)
	{
		this._loadingData = loadingData;
		this.notifyUpdate();
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