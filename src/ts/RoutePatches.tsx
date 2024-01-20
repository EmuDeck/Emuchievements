import { RoutePatch, ServerAPI } from "decky-frontend-lib";
import { Mountable } from "./System";
import { EmuchievementsState } from "./hooks/achievementsContext";
import { ReactElement } from "react";

function routePatch(serverAPI: ServerAPI, path: string, patch: RoutePatch): Mountable
{
	return {
		mount()
		{
			serverAPI.routerHook.addPatch(path, patch);
		},
		unMount()
		{
			serverAPI.routerHook.removePatch(path, patch);
		}
	};
}

export function patchAppPage(state: EmuchievementsState): Mountable
{
	// @ts-ignore
	return routePatch(state.serverAPI, "/library/app/:appid", (props: { path: string, children: ReactElement; }) =>
	{
		return props;
	});
}