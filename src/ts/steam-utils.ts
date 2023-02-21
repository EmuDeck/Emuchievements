import {sleep} from "decky-frontend-lib";
import {SteamAppDetails, SteamAppOverview} from "./SteamTypes";
import {Promise} from "bluebird"

export async function getAppOverview(appId: number): Promise<SteamAppOverview | null> {
	if (appStore === null) {
		console.log('Could not get app overview - null appStore!');
		return null;
	}

	try {
		return (await appStore.GetAppOverviewByAppID(appId)) ?? null;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export async function waitForAppOverview(appId: number, predicate: (overview: SteamAppOverview | null) => boolean) {
	let retries = 4;
	while (retries--) {
		if (predicate(await getAppOverview(appId))) {
			return true;
		}
		if (retries > 0) {
			await sleep(250);
		}
	}
	return false;
}

export async function getAllNonSteamAppIds(): Promise<number[]>
{
	return Array.from(collectionStore.deckDesktopApps.apps.keys());
}

export async function getAllNonSteamAppDetails(): Promise<SteamAppDetails[]>
{
	return (await Promise.map(await getAllNonSteamAppIds(), (async (appid) => await getAppDetails(appid)))).filter(app => app !== null) as SteamAppDetails[];
}

export async function getAllNonSteamAppOverview(): Promise<SteamAppOverview[]>
{
	return (await Promise.map(await getAllNonSteamAppIds(), (async (appid) => await getAppOverview(appid)))).filter(app => app !== null) as SteamAppOverview[];
}


export async function getAppDetails(appId: number): Promise<SteamAppDetails | null>
{
	return await new Promise((resolve) => {
		let timeoutId: NodeJS.Timeout | undefined = undefined;
		try {
			const { unregister } = SteamClient.Apps.RegisterForAppDetails(appId, (details: SteamAppDetails) => {
				clearTimeout(timeoutId);
				unregister();
				resolve(details);
			});

			timeoutId = setTimeout(() => {
				unregister();
				resolve(null);
			}, 1000);
		} catch (error) {
			clearTimeout(timeoutId);
			console.error(error);
			resolve(null);
		}
	});
}

export async function waitForAppDetails(appId: number, predicate: (details: SteamAppDetails | null) => boolean) {
	let retries = 4;
	while (retries--) {
		if (predicate(await getAppDetails(appId))) {
			return true;
		}
		if (retries > 0) {
			await sleep(250);
		}
	}

	return false;
}

export async function hideApp(appId: number) {
	if (!await waitForAppOverview(appId, (overview) => overview !== null)) {
		console.error(`Could not hide app ${appId}!`);
		return false;
	}

	const { collectionStore } = (window as any);
	if (collectionStore.BIsHidden(appId)) {
		return true;
	}

	collectionStore.SetAppsAsHidden([appId], true);

	let retries = 4;
	while (retries--) {
		if (collectionStore.BIsHidden(appId)) {
			return true;
		}
		if (retries > 0) {
			await sleep(250);
		}
	}

	return false;
}

export async function showApp(appId: number) {
	if (!await waitForAppOverview(appId, (overview) => overview !== null)) {
		console.error(`Could not show app ${appId}!`);
		return false;
	}

	const { collectionStore } = (window as any);
	if (!collectionStore.BIsHidden(appId)) {
		return true;
	}

	collectionStore.SetAppsAsHidden([appId], false);

	let retries = 4;
	while (retries--) {
		if (!collectionStore.BIsHidden(appId)) {
			return true;
		}
		if (retries > 0) {
			await sleep(250);
		}
	}

	return false;
}