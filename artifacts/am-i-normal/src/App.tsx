import { Switch, Route } from "wouter";
import GameScreen from "./GameScreen";
import SubmitScreen from "./pages/SubmitScreen";
import AdminScreen from "./pages/AdminScreen";
import MyHabitsScreen from "./pages/MyHabitsScreen";

export default function App() {
  return (
    <Switch>
      <Route path="/admin" component={AdminScreen} />
      <Route path="/submit" component={SubmitScreen} />
      <Route path="/my-habits" component={MyHabitsScreen} />
      <Route component={GameScreen} />
    </Switch>
  );
}
