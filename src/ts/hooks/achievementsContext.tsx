import {createContext, FC, useContext, useEffect, useState} from "react";

interface LoadingData
{
	globalLoading: boolean,
	currentGame: string,
	processed: number,
	total: number
}

interface PublicEmuchievementsState
{
	loadingData: LoadingData
}

export class EmuchievementsState
{
	private _loadingData: LoadingData = {
		globalLoading: true,
		total: 0,
		processed: 0,
		currentGame: "fetching"
	};

	public eventBus = new EventTarget();

	publicState(): PublicEmuchievementsState
	{
		return {
			loadingData: this._loadingData,
		};
	}

	setLoadingData(loadingData: LoadingData)
	{
		this._loadingData = loadingData;
		this.notifyUpdate();
	}

	private notifyUpdate()
	{
		this.eventBus.dispatchEvent(new Event('update'));
	}
}

interface EmuchievementsStateContext extends PublicEmuchievementsState
{
	setLoadingData(loadingData: LoadingData): void;
}

const EmuchievementsStateContext = createContext<EmuchievementsStateContext>(null as any);

export const useEmuchievementsState = () => useContext(EmuchievementsStateContext);

interface Props
{
	emuchievementsState: EmuchievementsState;
}

export const EmuchievementsStateContextProvider: FC<Props> = ({children, emuchievementsState}) => {
	const [publicEmuchievementsState, setPublicEmuchievementsState] = useState<PublicEmuchievementsState>({...emuchievementsState.publicState()});

	useEffect(() => {
		function onUpdate()
		{
			setPublicEmuchievementsState({...emuchievementsState.publicState()});
		}

		emuchievementsState.eventBus.addEventListener('update', onUpdate);

		return () => emuchievementsState.eventBus.removeEventListener('update', onUpdate);
	}, []);

	const setLoadingData = (loadingData: LoadingData) => emuchievementsState.setLoadingData(loadingData);

	return (
		   <EmuchievementsStateContext.Provider
				 value={{...publicEmuchievementsState, setLoadingData}}
		   >
			   {children}
		   </EmuchievementsStateContext.Provider>
	);
};