import {Focusable, PanelSectionRow, ProgressBarWithInfo, SteamSpinner} from 'decky-frontend-lib';
import {
	FC,
	ReactElement,
	ReactNode,
	Suspense,
	useCallback,
	useState
} from 'react';
import {useEmuchievementsState} from "../hooks/achievementsContext";

interface WithSuspenseProps {
	children: ReactNode,
	route?: boolean
}
interface WithSuspenseAchievementsProps {
	children: ReactNode,
	route?: boolean
}

export function wrapPromise<T>(promise: Promise<T>) {
	let status = 'pending';
	let response: T;

	const suspender = promise.then(
		   res => {
			   status = 'success';
			   response = res;
		   },
		   err => {
			   status = 'error';
			   response = err;
		   },
	);

	const handler = {
		pending: () => {
			throw suspender;
		},
		error: () => {
			throw response;
		},
		default: () => response,
	};

	const read = (): T => handler[status] ? handler[status]() :
		   handler.default();

	return { read };
}

// Nice little wrapper around Suspense so we don't have to duplicate the styles and code for the loading spinner
export const WithSuspense: FC<WithSuspenseProps> = (props) => {
	const propsCopy = {...props};
	delete propsCopy.children;
	(props.children as ReactElement)?.props && Object.assign((props.children as ReactElement).props, propsCopy); // There is probably a better way to do this but valve does it this way so ¯\_(ツ)_/¯
	return (
		   <Suspense
				 fallback={
					 <Focusable
						    // needed to enable focus ring so that the focus properly resets on load
						    onActivate={() => {
						    }}
						    style={{
							    overflowY: 'scroll',
							    backgroundColor: 'transparent',
							    ...(props.route && {
								    marginTop: '40px',
								    height: 'calc( 100% - 40px )',
							    }),
						    }}
					 >
						 <SteamSpinner/>
					 </Focusable>
				 }
		   >
			   {props.children}
		   </Suspense>
	);
};
export const useForceUpdate = () => {
	const [, updateState] = useState({});
	return useCallback(() => updateState({}), []);
}

export function WithSuspenseAchievements(props: WithSuspenseAchievementsProps)
{
	const {loadingData} = useEmuchievementsState();
	const propsCopy = {...props};
	delete propsCopy.children;
	(props.children as ReactElement)?.props && Object.assign((props.children as ReactElement).props, propsCopy); // There is probably a better way to do this but valve does it this way so ¯\_(ツ)_/¯


	return (
		   <Suspense
				 fallback={
					 <Focusable
						    // needed to enable focus ring so that the focus properly resets on load
						    onActivate={() => {
						    }}
						    style={{
							    overflowY: 'scroll',
							    backgroundColor: 'transparent',
							    ...(props.route && {
								    marginTop: '40px',
								    height: 'calc( 100% - 40px )',
							    }),
						    }}
					 >
						 {/*<SteamSpinner/>*/}
						 <PanelSectionRow>
							 <ProgressBarWithInfo
								    nProgress={(loadingData.processed / loadingData.total) * 100}
								    label={"Loading"}
								    description={`${loadingData.processed}/${loadingData.total}`}
								    sOperationText={loadingData.currentGame}
							 />
						 </PanelSectionRow>
					 </Focusable>
				 }
		   >
			   {props.children}
		   </Suspense>
	);
}