import {
	afterPatch,
	DialogButton,
	findInReactTree,
	Router,
	ServerAPI,
	wrapReactClass,
	wrapReactType
} from "decky-frontend-lib";
import {ReactElement} from "react";
import {RouteProps} from "react-router";
import {AppDetails, AppOverview} from "./SteamClient";
import {AchievementManager} from "./AchievementsManager";
import {Patching} from "./Patching";
import skip = Patching.skip;
import WrapType = Patching.WrapType;
import {runInAction} from "mobx";

export const patchAppPage = (serverAPI: ServerAPI, achievementManager: AchievementManager): (route: RouteProps) => RouteProps =>
{
	// @ts-ignore
	return serverAPI.routerHook.addPatch("/library/app/:appid", (props: { path: string, children: ReactElement }) =>
	{
		afterPatch(
				props.children.props,
				"renderFunc",
				(_: Record<string, unknown>[], ret1: ReactElement) =>
				{
					//console.log("ret1", ret1);
					const overview: AppOverview = ret1.props.children.props.overview;
					const details: AppDetails = ret1.props.children.props.details;

					const appId: number = overview.appid;
					if (overview.app_type==1073741824)
					{
						if (achievementManager.isReady(appId))
						{
							const ret = achievementManager.fetchAchievements(appId);
							runInAction(() =>
							{
								if (ret.all.data)
								{
									details.achievements.nAchieved = Object.keys(ret.all.data.achieved).length;
									details.achievements.nTotal = Object.keys(ret.all.data.achieved).length + Object.keys(ret.all.data.unachieved).length;
									details.achievements.vecHighlight = [];
									Object.entries(ret.all.data.achieved).forEach(([, value]) =>
									{
										details.achievements.vecHighlight.push(value)
									});
									details.achievements.vecUnachieved = [];
									Object.entries(ret.all.data.unachieved).forEach(([, value]) =>
									{
										details.achievements.vecUnachieved.push(value)
									});
									//console.log("Added achievements to ", details);
								}
							});
						}
						wrapReactType(ret1.props.children);
						afterPatch(
								ret1.props.children.type,
								"type",
								(_: Record<string, unknown>[], ret2: ReactElement) =>
								{
									//console.log("ret2", ret2);
									let element = findInReactTree(ret2, x => x?.props?.onTheaterMode);
									//console.log("element1", element);
									wrapReactClass(element);
									afterPatch(
											element.type.prototype,
											"render",
											(_: Record<string, unknown>[], ret3: ReactElement) =>
											{
												//console.log("ret3", ret3);
												let element2 = findInReactTree(ret3, x => x?.props?.setSections);
												//console.log("element2", element2);
												afterPatch(
														element2,
														"type",
														(_: Record<string, unknown>[], ret4: ReactElement) =>
														{
															// //console.log("ret4", ret4);
															if (achievementManager.isReady(appId)) (ret4.props.setSections as Set<string>).add("achievements");
															else (ret4.props.setSections as Set<string>).delete("achievements");
															return ret4;
														}
												);
												return ret3;
											}
									);
									return ret2;
								}
						);
					}
					return ret1;
				}
		);
		return props;
	});
}

export const patchAppPageExperimental = (serverAPI: ServerAPI, achievementManager: AchievementManager): (route: RouteProps) => RouteProps =>
{
	// @ts-ignore
	return serverAPI.routerHook.addPatch("/library/app/:appid", (props: { path: string, children: ReactElement }) =>
	{
		Patching.patch<{
			overview?: AppOverview,
			details?: AppDetails,
			appId: number
		}>(props.children, {appId: 0})
			.afterPatchBasic(
						ret => ret.props,
						"renderFunc",
						(_, ret, vars) =>
				{
					//console.log(ret)
					vars.overview = ret?.props?.children?.props?.overview
					vars.details = ret?.props?.children?.props?.details
					if (vars.overview && vars.details && vars.overview.app_type==1073741824)
					{
						vars.appId = vars.overview.appid;
						if (achievementManager.isReady(vars.appId))
						{
							const data = achievementManager.fetchAchievements(vars.appId);
							if (data.all.data)
							{
								vars.details.achievements.nAchieved = Object.keys(data.all.data.achieved).length;
								vars.details.achievements.nTotal = Object.keys(data.all.data.achieved).length + Object.keys(data.all.data.unachieved).length;
								//console.log("achievements", vars.details.achievements)
								// Object.entries(ret.all.data.achieved).forEach(([, value]) =>
								// {
								// 	details.achievements.vecHighlight.push(value)
								// });
								// Object.entries(ret.all.data.unachieved).forEach(([, value]) =>
								// {
								// 	details.achievements.vecUnachieved.push(value)
								// });
								return {
									ret,
									vars
								}
							} else return skip;


						} else
						{
							//console.log("no achievements")
							return skip;
						}

					}
					else return skip;
				}
			)
				.afterPatchWrapping(
						ret =>
						{
							//console.log("children", ret)
							return ret?.props?.children;
						},
						"type",
						WrapType.TYPE,
						(_, ret, vars) => {
							//console.log("level1", ret)
							return {
								ret,
								vars
							}
						}
				)
					.afterPatchWrapping(
							ret => findInReactTree(ret, x => x?.props?.onTheaterMode),
							"render",
							WrapType.CLASS,
							(_, ret, vars) => {
								//console.log("level2", ret)
								return {
									ret,
									vars
								}
							}
					)
						.afterPatchBasic(
								ret => findInReactTree(ret, x => x?.props?.setSections),
								"type",
								(_, ret, vars) => {
									//console.log("level3", ret)
									return {
										ret,
										vars
									}
								}
						)
							.afterPatchBasic(
									ret => ret,
									"type",
									(_, ret, vars) => {
										//console.log("level4", ret)
										return {
											ret,
											vars
										}
									}
							)
								.afterPatchWrappingMobX(
										ret => findInReactTree(ret, x => x?.props?.onNav),
										"render",
										"type",
										WrapType.TYPE,
										(_, ret, vars) => {
											//console.log("level5", ret)
											return {
												ret,
												vars
											}
										}
								)
									.afterPatchWrappingMobX(
											ret => findInReactTree(ret, x => x?.type?.render),
											"render",
											"type",
											WrapType.TYPE,
											(_, ret, vars) => {
												//console.log("level6", ret)
												return {
													ret,
													vars
												}
											}
									)
										.afterPatchWrappingMobX(
												ret => findInReactTree(ret, x => x?.props?.onTheaterMode),
												"render",
												"type",
												WrapType.TYPE,
												(_, ret, vars) => {
													//console.log("level7", ret)
													return {
														ret,
														vars
													}
												}
										)
											.afterPatchWrapping(
													ret => findInReactTree(ret, x => x?.props?.statusPanelType==1),
													"render",
													WrapType.CLASS,
													(_, ret, vars) => {
														//console.log("level8", ret)
														return {
															ret,
															vars
														}
													}
											)
												.afterPatchWrapping(
														ret => findInReactTree(ret, x => x?.[1]?.type?.prototype?.render && !x?.[1]?.type?.prototype?.shouldComponentUpdate)?.[0],
														"render",
														WrapType.CLASS,
														(_, ret, vars) =>
														{
															//console.log("level9", ret)
															let element = findInReactTree(ret, x => x?.type?.name === "re");
															if (achievementManager.isReady(vars.appId))
															{
																ret?.props?.children?.push(
																		<div>
																			<DialogButton
																					onClick={() =>
																					{
																						Router.Navigate(`/library/app/${vars.appId}/achievements/my/individual`)
																					}}>
																				Retroachievements
																			</DialogButton>
																		</div>
																)
															}
															wrapReactClass(element);
															element.props.onSeek = (_: string) =>
															{
																Router.Navigate(`/library/app/${vars.appId}/achievements/my/individual`)
															}

															return {
																ret,
																vars
															}
														}
												)
												.done()
											.done()
										.done()
									.done()
								.done()
							.done()
						.done()
					.done()
				.done()
			.done()
		.done()
		return props;
	});
}