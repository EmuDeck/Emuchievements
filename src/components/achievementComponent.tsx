import {Component} from "react";
import {AchievementProps} from "../interfaces";

export class AchievementComponent extends Component<AchievementProps> {
    render() {
        let {achievement} = this.props;
        return (
            <div style={{
                display: "flex",
                flexDirection: "row"
            }}>
                <img src={`https://media.retroachievements.org/Badge/${achievement.badge_name}.png`} alt={"ICON"}
                     style={(() => {
                         if (achievement.date_awarded || achievement.date_awarded_hardcore) {
                             return {}
                         } else {
                             return {
                                 filter: "grayscale(1)"
                             }
                         }
                     })()}/>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                }}>
                    <div>
                        {achievement.title}: {(() => {
                        if (achievement.date_awarded_hardcore) {
                            return "Hardcore";
                        } else if (achievement.date_awarded) {
                            return "Earned";
                        } else {
                            return "Not Earned";
                        }
                    })()}
                    </div>
                    <div>
                        {achievement.description}
                    </div>
                </div>
            </div>
        )
    }
}