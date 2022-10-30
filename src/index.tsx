import {definePlugin, ServerAPI, staticClasses} from "decky-frontend-lib";
import {FaClipboardCheck} from "react-icons/fa";
import {GameComponent} from "./components/gameComponent";
import {EmuchievementsComponent} from "./components/emuchievementsComponent";
import {LoginComponent} from "./components/loginComponent";
import {DescriptionComponent} from "./components/descriptionComponent";

export default definePlugin((serverAPI: ServerAPI) => {
    serverAPI.routerHook.addRoute("/emuchievements/game", () => <GameComponent serverAPI={serverAPI}/>);
    serverAPI.routerHook.addRoute("/emuchievements/achievement", () => <DescriptionComponent serverAPI={serverAPI}/>);
    serverAPI.routerHook.addRoute("/emuchievements/login", () => <LoginComponent serverAPI={serverAPI}/>);
    return {
        title: <div className={staticClasses.Title}>Emuchievements</div>,
        content: <EmuchievementsComponent serverAPI={serverAPI}/>,
        icon: <FaClipboardCheck/>,
        onDismount() {
            serverAPI.routerHook.removeRoute("/emuchievements/game");
            serverAPI.routerHook.removeRoute("/emuchievements/achievement");
            serverAPI.routerHook.removeRoute("/emuchievements/login");
        },
    };
});
