import {APIProps, APIState} from "../interfaces";
import {getData} from "../state";
import {Component} from "react";

export abstract class ApiComponent<P extends APIProps> extends Component<P, APIState> {
    state: Readonly<APIState> = {
        games: [],
        achievements: {},
        loading: true
    };

    componentDidMount() {
        let {serverAPI} = this.props;
        getData(serverAPI).then(value => {
            this.setState(value)
        })
    }
}