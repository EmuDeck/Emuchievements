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
					const overview: AppOverview = ret1.props.children.props.overview;
					const details: AppDetails = ret1.props.children.props.details;

					const appId: number = overview.appid;
					if (overview.app_type==1073741824)
					{
						if (achievementManager.isReady(appId))
						{
							const ret = achievementManager.fetchAchievements(serverAPI, appId);
							if (ret.all.data)
							{
								details.achievements.nAchieved = Object.keys(ret.all.data.achieved).length;
								details.achievements.nTotal = Object.keys(ret.all.data.achieved).length + Object.keys(ret.all.data.unachieved).length;
								console.log("achievements", details.achievements)
								// Object.entries(ret.all.data.achieved).forEach(([, value]) =>
								// {
								// 	details.achievements.vecHighlight.push(value)
								// });
								// Object.entries(ret.all.data.unachieved).forEach(([, value]) =>
								// {
								// 	details.achievements.vecUnachieved.push(value)
								// });
							}
						}
						else console.log("no achievements")

						// console.log(appId, gameId);
						console.log("test1", ret1);
						wrapReactType(ret1.props.children);
						afterPatch(
								ret1.props.children.type,
								"type",
								(_: Record<string, unknown>[], ret2: ReactElement) =>
								{
									console.log("test2", ret2);
									let element = findInReactTree(ret2, x => x?.props?.onTheaterMode);
									// console.log("element", element);
									wrapReactClass(element);
									afterPatch(
											element.type.prototype,
											"render",
											(_: Record<string, unknown>[], ret3: ReactElement) =>
											{
												// console.log("test3", ret3);
												let element1 = findInReactTree(ret3, x => x?.props?.setSections);
												// console.log("element1", element1);
												afterPatch(
														element1,
														"type",
														(_: Record<string, unknown>[], ret4: ReactElement) =>
														{
															// console.log("test4", ret4);
															let wrap1: any;
															let wrap2: any;
															let wrap3: any;

															afterPatch(
																	ret4,
																	"type",
																	(_: Record<string, unknown>[], ret5: ReactElement) =>
																	{
																		// console.log("test5", ret5);
																		let element2 = findInReactTree(ret5, x => x?.props?.onNav);
																		// console.log("element2", element2);
																		wrapReactType(element2);
																		if (wrap1)
																		{
																			element2.type = wrap1;
																		} else
																		{
																			wrap1 = element2.type;
																			afterPatch(
																					element2.type,
																					"render",
																					(_: Record<string, unknown>[], ret6: ReactElement) =>
																					{
																						// console.log("test6", ret6);
																						let element3 = findInReactTree(ret6, x => x?.type?.render);
																						// console.log("element3", element3);
																						if (wrap2)
																						{
																							element3.type = wrap2;
																						} else
																						{
																							wrapReactType(element3);
																							wrap2 = element3.type;
																							afterPatch(
																									element3.type,
																									"render",
																									(_: Record<string, unknown>[], ret7: ReactElement) =>
																									{
																										// console.log("test7", ret7);
																										let element4 = findInReactTree(ret7, x => x?.props?.onTheaterMode);
																										// console.log("element4", element4)
																										if (wrap3)
																										{
																											element4.type = wrap3;
																										} else
																										{
																											wrapReactType(element4);
																											wrap3 = element4.type;
																											afterPatch(
																													element4.type,
																													"render",
																													(_: Record<string, unknown>[], ret8: ReactElement) =>
																													{
																														// console.log("test8", ret8);
																														let element5 = findInReactTree(ret8, x => x?.props?.statusPanelType==1);
																														// console.log("element5", element5);
																														wrapReactClass(element5);
																														afterPatch(
																																element5.type.prototype,
																																"render",
																																(_: Record<string, unknown>[], ret9: ReactElement) =>
																																{
																																	// console.log("test9", ret9);
																																	// noinspection JSPotentiallyInvalidConstructorUsage
																																	let element6 = findInReactTree(ret9, x => x?.[1]?.type?.prototype?.render && !x?.[1]?.type?.prototype?.shouldComponentUpdate)?.[0];
																																	// console.log("element6", element6);
																																	wrapReactClass(element6);
																																	afterPatch(
																																			element6.type.prototype,
																																			"render",
																																			(_: Record<string, unknown>[], ret10: ReactElement) =>
																																			{
																																				// console.log("test10", ret10);
																																				let element7 = findInReactTree(ret10, x => x?.type?.name==="re");
																																				// let element7 = ret10?.props?.children?.[5]

																																				if (achievementManager.isReady(appId))
																																				{
																																					ret10?.props?.children.push(
																																							<div>
																																								<DialogButton
																																										onClick={() =>
																																										{
																																											Router.Navigate(`/library/app/${appId}/achievements/my/individual`)
																																										}}>
																																									Retroachievements
																																								</DialogButton>
																																							</div>
																																					)
																																				}


																																				// console.log("element7", element7);
																																				wrapReactClass(element7);
																																				// console.log("element7, wrapped", element7);
																																				element7.props.onSeek = (_: string) =>
																																				{
																																					Router.Navigate(`/library/app/${appId}/achievements/my/individual`)
																																				}
																																				// afterPatch(
																																				// 		element7.type.prototype,
																																				// 		"render",
																																				// 		(_: Record<string, unknown>[], ret11: ReactElement) =>
																																				// 		{
																																				// 			// console.log("test11", ret11);
																																				// 			return ret11;
																																				// 		}
																																				// );
																																				return ret10;
																																			}
																																	);
																																	return ret9;
																																}
																														);
																														return ret8;
																													}
																											);
																										}
																										return ret7;
																									}
																							);
																						}
																						return ret6;
																					}
																			);
																		}
																		return ret5;
																	}
															);
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
					console.log(ret)
					vars.overview = ret?.props?.children?.props?.overview
					vars.details = ret?.props?.children?.props?.details
					if (vars.overview && vars.details && vars.overview.app_type==1073741824)
					{
						vars.appId = vars.overview.appid;
						if (achievementManager.isReady(vars.appId))
						{
							const data = achievementManager.fetchAchievements(serverAPI, vars.appId);
							if (data.all.data)
							{
								vars.details.achievements.nAchieved = Object.keys(data.all.data.achieved).length;
								vars.details.achievements.nTotal = Object.keys(data.all.data.achieved).length + Object.keys(data.all.data.unachieved).length;
								console.log("achievements", vars.details.achievements)
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
							console.log("no achievements")
							return skip;
						}

					}
					else return skip;
				}
			)
				.afterPatchWrapping(
						ret =>
						{
							console.log("children", ret)
							return ret?.props?.children;
						},
						"type",
						WrapType.TYPE,
						(_, ret, vars) => {
							console.log("level1", ret)
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
								console.log("level2", ret)
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
									console.log("level3", ret)
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
										console.log("level4", ret)
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
											console.log("level5", ret)
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
												console.log("level6", ret)
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
													console.log("level7", ret)
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
														console.log("level8", ret)
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
															console.log("level9", ret)
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